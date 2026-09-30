// Resolução de empresa (tenant) por domínio — multi-tenant
//
// Regras:
//  - Header explícito `X-Company-Id` (slug da organização) tem prioridade
//  - Senão, resolve pelo Host (fallback X-Forwarded-Host para rewrites externos)
//  - localhost/127.0.0.1 e domínios não cadastrados → organização 'default'
//    (garante que o projeto atual e o dev continuem funcionando sem mudanças)
//  - Cache em memória com TTL para evitar consulta ao Turso por request
import { rowsToObjects } from '../rows.js'

const TTL = 60 * 1000
const DEFAULT_ID = 'default'

let _cache = { ts: 0, promise: null, list: [] }
let _warnedDomains = new Set()

function getHost(req) {
  return (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].trim().toLowerCase()
}

function loadOrganizations(db) {
  if (_cache.promise) return _cache.promise
  const now = Date.now()
  if (now - _cache.ts < TTL) return Promise.resolve(_cache.list)
  _cache.promise = (async () => {
    try {
      const result = await db.execute('SELECT id, nome, slug, domains, settings, status FROM organizations')
      _cache.list = rowsToObjects(result.rows, result.columns).map((o) => ({
        ...o,
        domains: safeParse(o.domains, []),
        settings: safeParse(o.settings, {}),
      }))
    } catch (e) {
      console.error('[tenant] loadOrganizations failed:', e.message)
      _cache.list = []
    }
    _cache.ts = Date.now()
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

export async function tenantMiddleware(req, _res, next) {
  try {
    const orgs = await loadOrganizations(req.db)
    const companyRef = req.headers['x-company-id']
    const host = getHost(req)
    const found = companyRef
      ? findCompanyByRef(orgs, companyRef)
      : findCompanyByRef(orgs, host)

    if (found) {
      req.company_id = found.id
      req.company = found
    } else {
      const unknown = companyRef || host
      if (unknown && !_warnedDomains.has(unknown)) {
        _warnedDomains.add(unknown)
        console.warn(`[tenant] referência '${unknown}' não cadastrada — usando organização '${DEFAULT_ID}'`)
      }
      req.company_id = DEFAULT_ID
      req.company = orgs.find((o) => o.id === DEFAULT_ID) || { id: DEFAULT_ID, nome: 'default', slug: 'default', domains: [], settings: {} }
    }
  } catch (e) {
    console.error('[tenant] resolution failed, falling back to default:', e.message)
    req.company_id = DEFAULT_ID
    req.company = { id: DEFAULT_ID, nome: 'default', slug: 'default', domains: [], settings: {} }
  }
  next()
}
