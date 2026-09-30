import jwt from 'jsonwebtoken'
import supabaseAdmin from '../supabaseAdmin.js'
import { ROLES } from '../roles.js'

const JWT_SECRET = process.env.JWT_SECRET || 'cms-secret-key-change-in-production'

export function generateToken(username, role, company_id) {
  return jwt.sign({ username, role, company_id: company_id || 'default' }, JWT_SECRET, { expiresIn: '24h' })
}

// Kill-switch TENANT_ENFORCE: quando ativo, um usuário só pode acessar a API
// pela empresa do próprio domínio (super_admin passa). Desligado por padrão —
// o comportamento atual (sem restrição por domínio) é preservado.
const TENANT_ENFORCE = process.env.TENANT_ENFORCE === 'true'

function enforceTenant(req, res) {
  if (!TENANT_ENFORCE) return true
  if (!req.user) return false
  if (req.user.role === ROLES.SUPER_ADMIN) return true
  const userCompany = req.user.company_id || 'default'
  const resolvedCompany = req.company_id || 'default'
  if (userCompany === resolvedCompany) return true
  res.status(403).json({ error: 'Acesso restrito à escola deste domínio' })
  return false
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.slice(7)

  // Super admin navegando dentro de uma organização específica (header
  // explícito X-Company-Id, setado pelo dashboard de super_admin): passa a
  // operar na empresa resolvida pelo tenant. A resolução valida que a
  // referência é uma organização existente (tenantMiddleware cai em 'default'
  // para referências desconhecidas — sem risco de vazamento).
  function applyTenantOverride() {
    if (
      req.user &&
      req.user.role === ROLES.SUPER_ADMIN &&
      req.headers['x-company-id'] &&
      req.company_id
    ) {
      req.user.company_id = req.company_id
    }
  }

  // 1. Try Supabase auth first (if configured)
  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (user && !error) {
        req.user = {
          username: user.email || user.id,
          // Never default to super_admin — a missing role metadata must DENY, not escalate.
          role: user.user_metadata?.role || null,
          company_id: user.user_metadata?.company_id || 'default',
          supabaseUid: user.id,
          professor_id: user.user_metadata?.professor_id || '',
        }
        console.log('[Auth Middleware] Autenticado via Supabase:', req.user.username, 'role:', req.user.role, 'company_id:', req.user.company_id, 'professor_id:', req.user.professor_id)
        applyTenantOverride()
        if (!enforceTenant(req, res)) return
        return next()
      }
    } catch {}
  }

  // 2. Fallback: custom JWT (Turso)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    let professorId = ''
    // Professores têm o vínculo consultado no banco a cada request, para que
    // mudanças de vínculo sejam aplicadas imediatamente (sem depender do token).
    if (decoded.role === ROLES.PROFESSOR && req.db) {
      try {
        const r = await req.db.execute({
          sql: 'SELECT professor_id FROM users WHERE username = ?',
          args: [decoded.username],
        })
        professorId = r.rows.length > 0 ? String(r.rows[0].professor_id || '') : ''
      } catch {}
    }
    req.user = {
      ...decoded,
      company_id: decoded.company_id || 'default',
      professor_id: professorId,
    }
    console.log('[Auth Middleware] Autenticado via Turso (custom JWT):', req.user.username, 'role:', req.user.role, 'company_id:', req.user.company_id, 'professor_id:', professorId)
    applyTenantOverride()
    if (!enforceTenant(req, res)) return
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    let role = req.user.role
    if (!role && req.db) {
      try {
        const result = await req.db.execute({
          sql: 'SELECT role FROM users WHERE username = ?',
          args: [req.user.username],
        })
        if (result.rows.length > 0) {
          role = result.rows[0].role
        }
      } catch {}
    }
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' })
    }
    next()
  }
}
