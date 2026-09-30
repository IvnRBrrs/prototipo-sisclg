import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES, ROLE_WEIGHT, ROLE_NAMES, canManageRole, canCreateRole } from '../roles.js'
import supabaseAdmin from '../supabaseAdmin.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN))

function mapSupabaseUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'editor_admin',
    company_id: u.user_metadata?.company_id || 'default',
    professor_id: u.user_metadata?.professor_id || '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at || '',
    confirmed_at: u.confirmed_at || '',
  }
}

router.get('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error
    let users = (data?.users || []).map(mapSupabaseUser)

    // gestor_admin: only sees users of the SAME company, with role <= GESTOR_WEIGHT
    if (req.user.role === ROLES.GESTOR_ADMIN) {
      const myCompany = req.user.company_id || 'default'
      const maxWeight = ROLE_WEIGHT[ROLES.GESTOR_ADMIN]
      users = users.filter(u => u.company_id === myCompany && (ROLE_WEIGHT[u.role] || 0) <= maxWeight)
    }

    res.json(users)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: err.message || 'Failed to list Supabase users' })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }
    const { email, password, role, company_id, professor_id } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    if (role && !ROLE_NAMES[role]) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const newRole = role || 'editor_admin'
    if (newRole === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Somente super_admin pode criar usuários super_admin' })
    }
    // gestor_admin can only create users with strictly lower role weight
    if (req.user.role === ROLES.GESTOR_ADMIN && !canCreateRole(ROLES.GESTOR_ADMIN, newRole)) {
      return res.status(403).json({ error: 'Cannot create users with this role' })
    }
    // Apenas super_admin pode definir a empresa; gestor cria na própria empresa
    const metaCompanyId = req.user.role === ROLES.SUPER_ADMIN
      ? (company_id || req.user?.company_id || 'default')
      : (req.user?.company_id || 'default')

    // Vínculo com cadastro de professor: só para role professor, professor
    // existente na mesma empresa e sem outro login já vinculado.
    const pid = professor_id !== undefined && professor_id !== null ? String(professor_id).trim() : ''
    if (pid) {
      if (newRole !== ROLES.PROFESSOR) {
        return res.status(400).json({ error: 'professor_id só pode ser vinculado a um usuário professor' })
      }
      const prof = await req.db.execute({
        sql: 'SELECT id FROM professores WHERE id = ? AND company_id = ?',
        args: [pid, metaCompanyId],
      })
      if (prof.rows.length === 0) return res.status(400).json({ error: 'Professor não encontrado' })
      const dup = await req.db.execute({
        sql: 'SELECT id FROM users WHERE professor_id = ? AND company_id = ?',
        args: [pid, metaCompanyId],
      })
      if (dup.rows.length > 0) return res.status(400).json({ error: 'Este professor já está vinculado a outro login' })
    }

    const meta = { role: newRole, company_id: metaCompanyId }
    if (pid) meta.professor_id = pid
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    })
    if (error) throw error
    res.json({ success: true, id: data.user.id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: err.message || 'Failed to create Supabase user' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }
    const { email, role, company_id, professor_id } = req.body

    // Fetch target user: permission check (gestor) + merge de metadados existentes
    const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(req.params.id)
    if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })

    // gestor_admin: only can manage users with role <= GESTOR_WEIGHT, same company
    if (req.user.role === ROLES.GESTOR_ADMIN) {
      const targetRole = td.user.user_metadata?.role || 'editor_admin'
      if ((td.user.user_metadata?.company_id || 'default') !== (req.user.company_id || 'default')) {
        return res.status(403).json({ error: 'Cannot edit users from another company' })
      }
      if (!canManageRole(ROLES.GESTOR_ADMIN, targetRole)) {
        return res.status(403).json({ error: 'Cannot edit users with higher role' })
      }
    }

    const existingMeta = td.user.user_metadata || {}
    const updates = {}
    if (email !== undefined) updates.email = email

    const meta = { ...existingMeta }
    if (role !== undefined) {
      if (!ROLE_NAMES[role]) return res.status(400).json({ error: 'Invalid role' })
      if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Somente super_admin pode atribuir super_admin' })
      }
      if (req.user.role === ROLES.GESTOR_ADMIN && !canManageRole(ROLES.GESTOR_ADMIN, role)) {
        return res.status(403).json({ error: 'Cannot assign this role' })
      }
      meta.role = role
    }
    if (company_id !== undefined) {
      if (req.user.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Only super_admin can change company_id' })
      }
      meta.company_id = company_id || 'default'
    }
    if (professor_id !== undefined) {
      const pid = String(professor_id).trim()
      if (pid) {
        const effectiveRole = role !== undefined ? role : (existingMeta.role || 'editor_admin')
        if (effectiveRole !== ROLES.PROFESSOR) {
          return res.status(400).json({ error: 'professor_id só pode ser vinculado a um usuário professor' })
        }
        const companyForUser = meta.company_id || 'default'
        const prof = await req.db.execute({
          sql: 'SELECT id FROM professores WHERE id = ? AND company_id = ?',
          args: [pid, companyForUser],
        })
        if (prof.rows.length === 0) return res.status(400).json({ error: 'Professor não encontrado' })
        const dup = await req.db.execute({
          sql: 'SELECT id FROM users WHERE professor_id = ? AND company_id = ?',
          args: [pid, companyForUser],
        })
        if (dup.rows.length > 0) return res.status(400).json({ error: 'Este professor já está vinculado a outro login' })
      }
      meta.professor_id = pid
    }
    if (role !== undefined || company_id !== undefined || professor_id !== undefined) {
      updates.user_metadata = meta
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, updates)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: err.message || 'Failed to update Supabase user' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }

    // gestor_admin cannot delete themselves
    if (req.user.role === ROLES.GESTOR_ADMIN && req.user.supabaseUid === req.params.id) {
      return res.status(403).json({ error: 'You cannot delete yourself' })
    }

    // gestor_admin: check target user role AND company
    if (req.user.role === ROLES.GESTOR_ADMIN) {
      const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(req.params.id)
      if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })
      const targetRole = td.user.user_metadata?.role || 'editor_admin'
      if ((td.user.user_metadata?.company_id || 'default') !== (req.user.company_id || 'default')) {
        return res.status(403).json({ error: 'Cannot delete users from another company' })
      }
      if (!canManageRole(ROLES.GESTOR_ADMIN, targetRole)) {
        return res.status(403).json({ error: 'Cannot delete users with higher role' })
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: err.message || 'Failed to delete Supabase user' })
  }
})

router.post('/:id/reset-password', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' })
    }
    const { password } = req.body
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' })
    }

    // gestor_admin: check target user role AND company
    if (req.user.role === ROLES.GESTOR_ADMIN) {
      const { data: td, error: tdErr } = await supabaseAdmin.auth.admin.getUserById(req.params.id)
      if (tdErr || !td?.user) return res.status(404).json({ error: 'User not found' })
      const targetRole = td.user.user_metadata?.role || 'editor_admin'
      if ((td.user.user_metadata?.company_id || 'default') !== (req.user.company_id || 'default')) {
        return res.status(403).json({ error: 'Cannot reset password for users from another company' })
      }
      if (!canManageRole(ROLES.GESTOR_ADMIN, targetRole)) {
        return res.status(403).json({ error: 'Cannot reset password for users with higher role' })
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: err.message || 'Failed to reset password' })
  }
})

export default router
