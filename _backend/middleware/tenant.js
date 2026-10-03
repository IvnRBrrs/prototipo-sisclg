// Resolução de empresa (tenant) por domínio — multi-tenant
//
// Regras (em ordem de precedência):
//  1. Header explícito `X-Company-Id` de um super_admin autenticado (JWT
//     custom decodificado aqui) — permite ao super escolher/editar qualquer
//     organização no painel, MESMO em deploy pinado.
//  2. Pin do deploy (`TENANT_PINNED_ORG`): ABSOLUTO — o site serve única e
//     exclusivamente a organização dona do pin, cobrindo domínio, hosts
//     desconhecidos, previews *.vercel.app e headers forjados de não-super.
//     Se o frontend mandou pin diferente (`VITE_TENANT_ORG_ID` → header
//     `X-Tenant-Pin`), o backend vence e o desalinhamento é logado como erro.
//  3. Header `X-Tenant-Pin` (quando o backend NÃO tem pin): resolve a org
//     dona do pin — usado por deploys onde só o frontend é configurado.
//  4. Header explícito `X-Company-Id` (qualquer usuário) — contexto do painel
//  5. Host (fallback X-Forwarded-Host) — domínio registrado em organizations
//  6. localhost/127.0.0.1 e domínios não cadastrados → 'default'
//
//  - Cache em memória com TTL; falha de reload mantém a lista anterior
//    (nunca envenena com lista vazia).
import { rowsToObjects } from '../rows.js'
import jwt from 'jsonwebtoken'

const TTL = 60 * 1000
const DEFAULT_ID = 'default'
const JWT_SECRET = process.env.JWT_SECRET || 'cms-secret-key-change-in-production'

// Pin configurado no deploy (valor do pin, não o slug da org)
const PINNED = process.env.TENANT_PINNED_ORG || null

let _cache = { ts: 0, promise: null, list: [] }
let _warnedDomains = new Set()
let _warnedPinnedMissing = false

function getHost(req) {
  return (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].trim().toLowerCase()
}

function loadOrganizations(db) {
  if (_cache.promise) return _cache.promise
  const now = Date.now()
  if (now - _cache.ts < TTL) return Promise.resolve(_cache.list)
  _cache.promise = (async () => {
    try {
      const result = await db.execute('SELECT id, nome, slug, domains, settings, status, tenant_pin FROM organizations')
      _cache.list = rowsToObjects(result.rows, result.columns).map((o) => ({
        ...o,
        domains: safeParse(o.domains, []),
        settings: safeParse(o.settings, {}),
      }))
      // Só marca o TTL em SUCESSO — falha de reload não pode envenenar o
      // cache com lista vazia/stale por 60s. Mantém a lista anterior e
      // retenta já na próxima requisição.
      _cache.ts = Date.now()
    } catch (e) {
      console.error('[tenant] loadOrganizations failed (mantendo lista anterior):', e.message)
    }
    _cache.promise = null
    return _cache.list
  })()
  return _cache.promise
}

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch { return fallback }
}

export function invalidateTenantCache() {
  _cache = { ts: 0, promise: null, list: [] }
  console.log('[tenant] cache invalidated')
}

export function findCompanyByRef(orgs, ref) {
  if (!ref) return null
  const r = String(ref).trim().toLowerCase()
  if (r === 'localhost' || r === '127.0.0.1') return null
  for (const o of orgs) {
    if (!o.status || o.status === 'inactive') continue
    if (String(o.id).toLowerCase() === r || String(o.slug).toLowerCase() === r) return o
    if (o.domains.some((d) => String(d).trim().toLowerCase() === r)) return o
  }
  return null
}

function findOrgByPin(orgs, pin) {
  if (!pin) return null
  const p = String(pin).trim()
  if (!p) return null
  for (const o of orgs) {
    if (!o.status || o.status === 'inactive') continue
    if (String(o.tenant_pin || '').trim() === p) return o
  }
  return null
}

// O super_admin com header explícito escolhe a organização, mesmo em deploy
// pinado (requisito do painel). Decodifica o JWT custom (Turso).
function isSuperAdminRequest(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return false
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET)
    return decoded?.role === 'super_admin'
  } catch {
    return false
  }
}

function setCompany(req, org) {
  req.company_id = org.id
  req.company = org
}

function fallbackDefault(req, orgs) {
  req.company_id = DEFAULT_ID
  req.company = orgs.find((o) => o.id === DEFAULT_ID) || { id: DEFAULT_ID, nome: 'default', slug: 'default', domains: [], settings: {} }
}

function warnUnknown(unknown) {
  if (unknown && !_warnedDomains.has(unknown)) {
    _warnedDomains.add(unknown)
    console.warn(`[tenant] referência '${unknown}' não cadastrada — usando organização '${DEFAULT_ID}'`)
  }
}

export async function tenantMiddleware(req, _res, next) {
  try {
    const orgs = await loadOrganizations(req.db)
    const companyRef = req.headers['x-company-id']
    const frontendPin = req.headers['x-tenant-pin'] || null

    // 1. Super_admin + header explícito → admin escolhe a org (inclusive em deploy pinado)
    if (companyRef && isSuperAdminRequest(req)) {
      const found = findCompanyByRef(orgs, companyRef)
      if (found) {
        setCompany(req, found)
        return next()
      }
      // header inválido de super → segue para as demais regras
    }

    // 2. Pin do deploy: ABSOLUTO para todos os demais
    if (PINNED) {
      const pinnedOrg = findOrgByPin(orgs, PINNED)
      if (pinnedOrg) {
        // Validação da amarração frontend↔backend: se o frontend mandou um pin
        // diferente (VITE_TENANT_ORG_ID), o pin do BACKEND vence — erro alto.
        if (frontendPin && String(frontendPin).trim() !== String(PINNED).trim()) {
          console.error('[tenant] X-Tenant-Pin do frontend difere do TENANT_PINNED_ORG do backend — usando o pin do BACKEND. Deploy desalinhado!')
        }
        setCompany(req, pinnedOrg)
        return next()
      }
      if (!_warnedPinnedMissing) {
        _warnedPinnedMissing = true
        console.error('[tenant] TENANT_PINNED_ORG não corresponde a nenhuma organização ativa — usando resolução padrão. Verifique o pin no painel e no deploy!')
      }
    }

    // 3. Pin vindo só do frontend (backend sem pin configurado). Restrito a
    // requisições SAME-ORIGIN de navegador: o header Sec-Fetch-Site é
    // controlado pelo próprio navegador (JavaScript NÃO consegue forjá-lo —
    // "forbidden header"), então 'cross-site' bloqueia com garantia o abuso
    // por JS de outros sites. Header ausente (navegadores antigos, crawlers,
    // clientes diretos) é PERMITIDO — o poder residual equivale ao do
    // X-Company-Id público (slug adivinhável), sem quebrar visitante legítimo.
    // Bloqueado, o request cai para as regras 4/5/6 — o site continua
    // renderizando (resolução padrão), nunca trava.
    if (frontendPin) {
      const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase()
      if (secFetchSite === 'cross-site') {
        if (!_warnedDomains.has('pin-xsite:' + frontendPin)) {
          _warnedDomains.add('pin-xsite:' + frontendPin)
          console.warn('[tenant] X-Tenant-Pin em requisição cross-site de navegador — ignorado (regra same-origin)')
        }
      } else {
        const byPin = findOrgByPin(orgs, frontendPin)
        if (byPin) {
          setCompany(req, byPin)
          return next()
        }
        if (!_warnedDomains.has('pin:' + frontendPin)) {
          _warnedDomains.add('pin:' + frontendPin)
          console.warn('[tenant] X-Tenant-Pin desconhecido — ignorando e usando resolução padrão')
        }
      }
    }

    // 4/5/6. Comportamento clássico: header > host > default
    const host = getHost(req)
    const found = companyRef
      ? findCompanyByRef(orgs, companyRef)
      : findCompanyByRef(orgs, host)

    if (found) {
      setCompany(req, found)
    } else {
      warnUnknown(companyRef || host)
      fallbackDefault(req, orgs)
    }
  } catch (e) {
    console.error('[tenant] resolution failed, falling back to default:', e.message)
    req.company_id = DEFAULT_ID
    req.company = { id: DEFAULT_ID, nome: 'default', slug: 'default', domains: [], settings: {} }
  }
  next()
}
