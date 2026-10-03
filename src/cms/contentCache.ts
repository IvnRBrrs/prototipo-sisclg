import api, { fetchContent, fetchPages, fetchPageContent, fetchImages, fetchMessages, fetchContentAdmin, fetchPagesAdmin, fetchPageContentAdmin } from './api'

const PREFIX = 'cms_'
const TTL = 60 * 60 * 1000
function ck(id: string) { return PREFIX + id }

/* ------------------------------------------------------------------ */
/*  In-memory cache layer — survives component mount/unmount cycles   */
/* ------------------------------------------------------------------ */
const _memCache = new Map<string, { ts: number; d: unknown }>()

function readMemCache<T>(id: string): { ts: number; d: T } | null {
  const entry = _memCache.get(id)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) {
    _memCache.delete(id)
    return null
  }
  return entry as { ts: number; d: T }
}

function writeMemCache(id: string, data: unknown) {
  _memCache.set(id, { ts: Date.now(), d: data })
}

export function clearMemCache(id?: string) {
  if (id) _memCache.delete(id)
  else _memCache.clear()
}

/** Remove a cache entry from BOTH memory and localStorage.
 * The next fetch*Cached() call for this id will hit the network.
 * Também remove o equivalente do painel (sufixo _admin), se existir. */
const ADMIN_TWIN: Record<string, string> = {
  'global_content': 'global_content_admin',
  'pages': 'pages_admin',
}
export function invalidateCache(id: string) {
  clearMemCache(id)
  try { localStorage.removeItem(ck(id)) } catch {}
  let twin = ADMIN_TWIN[id]
  if (!twin && id.startsWith('page_')) twin = 'page_admin_' + id.slice('page_'.length)
  if (twin) {
    clearMemCache(twin)
    try { localStorage.removeItem(ck(twin)) } catch {}
  }
}

/** Wipe ALL cached data (memory + localStorage). Used when switching the
 *  active organization in the CMS dashboard, so stale data from another
 *  company is never shown.
 *  IMPORTANTE: preserva as chaves de SESSÃO (cms_token, cms_company_id) —
 *  apagá-las derrubava o login ao trocar de organização (401 em loop). */
const SESSION_KEYS = new Set(['cms_token', 'cms_company_id', 'supabase_token'])
export function invalidateAllCache() {
  _memCache.clear()
  _pendingFetches.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && !SESSION_KEYS.has(k)) keys.push(k)
    }
    keys.forEach(k => localStorage.removeItem(k))
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  localStorage layer                                                 */
/* ------------------------------------------------------------------ */
function getCached<T>(id: string): { ts: number; d: T } | null {
  try {
    const raw = localStorage.getItem(ck(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.ts !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function setCached<T>(id: string, d: T) {
  try {
    localStorage.setItem(ck(id), JSON.stringify({ ts: Date.now(), d }))
  } catch {
    try {
      localStorage.removeItem(ck(id))
      localStorage.setItem(ck(id), JSON.stringify({ ts: Date.now(), d }))
    } catch {
      /* localStorage not available or full — skip cache */
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Public helpers — seed cache from preload, get cached data sync    */
/* ------------------------------------------------------------------ */

/** Seed the cache with pre-fetched data (e.g. from admin preload).
 *  Writes to BOTH memory (instant) and localStorage (persistent). */
export function seedCache(id: string, data: unknown) {
  writeMemCache(id, data)
  setCached(id, data)
}

export function getCachedPageContent(slug: string): Record<string, string> | null {
  const id = 'page_' + slug
  const mem = readMemCache<Record<string, string>>(id)
  if (mem) { const d = mem.d; if (typeof d === 'object' && d && Object.keys(d).length > 0) return d }
  const c = getCached<Record<string, string>>(id)
  if (!c) return null
  const d = c.d
  if (typeof d !== 'object' || !d || Object.keys(d).length === 0) {
    try { localStorage.removeItem(ck(id)) } catch {}
    return null
  }
  return d
}

export function getCachedContentSync(): Record<string, string> | null {
  const mem = readMemCache<Record<string, string>>('global_content')
  if (mem) return mem.d
  const c = getCached<Record<string, string>>('global_content')
  return c ? c.d : null
}

export function getCachedPagesSync(): any[] | null {
  const mem = readMemCache<any[]>('pages')
  if (mem) return mem.d
  const c = getCached<any[]>('pages')
  return c ? c.d : null
}

export function getCachedPagesSyncAdmin(): any[] | null {
  const mem = readMemCache<any[]>('pages_admin')
  if (mem) return mem.d
  const c = getCached<any[]>('pages_admin')
  return c ? c.d : null
}

export function getCachedBlogPostsSync(): any[] | null {
  const mem = readMemCache<any[]>('blog_posts')
  if (mem) return mem.d
  const c = getCached<any[]>('blog_posts')
  return c ? c.d : null
}

export function getCachedMessagesSync(): any[] | null {
  const mem = readMemCache<any[]>('messages')
  if (mem) return mem.d
  const c = getCached<any[]>('messages')
  return c ? c.d : null
}

export function getCachedPreEnrollmentsSync(): any[] | null {
  const mem = readMemCache<any[]>('pre_enrollments')
  if (mem) return mem.d
  const c = getCached<any[]>('pre_enrollments')
  return c ? c.d : null
}

export function getCachedImagesSync(): any[] | null {
  const mem = readMemCache<any[]>('images')
  if (mem) return mem.d
  const c = getCached<any[]>('images')
  return c ? c.d : null
}

export function getCachedUsersSync(): any[] | null {
  const mem = readMemCache<any[]>('users')
  if (mem) return mem.d
  const c = getCached<any[]>('users')
  return c ? c.d : null
}

export function getCachedAlunosSync(): any[] | null {
  const mem = readMemCache<any[]>('alunos')
  if (mem) return mem.d
  const c = getCached<any[]>('alunos')
  return c ? c.d : null
}

/* ------------------------------------------------------------------ */
/*  Async fetch with cache (memory → localStorage → network)          */
/* ------------------------------------------------------------------ */
const _pendingFetches = new Map<string, Promise<{ data: any; cached: boolean }>>()

async function fetchWithCache<T>(id: string, fetcher: () => Promise<T>): Promise<{ data: T; cached: boolean }> {
  const mem = readMemCache<T>(id)
  if (mem) return { data: mem.d, cached: true }

  const cached = getCached<T>(id)
  if (cached && Date.now() - cached.ts < TTL) {
    const d = cached.d
    const isEmpty = (typeof d === 'object' && d !== null && !Array.isArray(d) && Object.keys(d).length === 0)
      || (Array.isArray(d) && d.length === 0)
    if (isEmpty) {
      try { localStorage.removeItem(ck(id)) } catch {}
    } else {
      writeMemCache(id, d)
      return { data: d, cached: true }
    }
  }
  const existing = _pendingFetches.get(id)
  if (existing) return existing
  const promise = (async () => {
    const data = await fetcher()
    writeMemCache(id, data)
    setCached(id, data)
    return { data, cached: false }
  })()
  _pendingFetches.set(id, promise)
  promise.finally(() => {
    if (_pendingFetches.get(id) === promise) _pendingFetches.delete(id)
  }).catch(() => {})
  return promise
}

export async function fetchPageContentCached(slug: string): Promise<{ data: Record<string, string>; cached: boolean }> {
  try {
    return await fetchWithCache('page_' + slug, () => fetchPageContent(slug))
  } catch { return { data: {}, cached: false } }
}

export async function fetchContentCached(): Promise<{ data: Record<string, string>; cached: boolean }> {
  try {
    return await fetchWithCache('global_content', () => fetchContent())
  } catch { return { data: {}, cached: false } }
}

// Variantes do PAINEL: conteúdo da própria organização, sem a substituição do
// "site principal" — o editor do CMS sempre edita o que exibe.
export async function fetchContentCachedAdmin(): Promise<{ data: Record<string, string>; cached: boolean }> {
  try {
    return await fetchWithCache('global_content_admin', () => fetchContentAdmin())
  } catch { return { data: {}, cached: false } }
}

export async function fetchPagesCached(): Promise<{ data: any[]; cached: boolean }> {
  try {
    const id = 'pages'
    const mem = readMemCache<any[]>(id)
    if (mem && Array.isArray(mem.d)) return { data: mem.d, cached: true }

    const raw = getCached<any[]>(id)
    if (raw && !Array.isArray(raw.d)) {
      try { localStorage.removeItem(ck(id)) } catch {}
    }
    const result = await fetchWithCache(id, () => fetchPages())
    if (!result || !Array.isArray(result.data)) return { data: [], cached: false }
    return result as { data: any[]; cached: boolean }
  } catch { return { data: [], cached: false } }
}

export async function fetchPagesCachedAdmin(): Promise<{ data: any[]; cached: boolean }> {
  try {
    const id = 'pages_admin'
    const mem = readMemCache<any[]>(id)
    if (mem && Array.isArray(mem.d)) return { data: mem.d, cached: true }

    const raw = getCached<any[]>(id)
    if (raw && !Array.isArray(raw.d)) {
      try { localStorage.removeItem(ck(id)) } catch {}
    }
    const result = await fetchWithCache(id, () => fetchPagesAdmin())
    if (!result || !Array.isArray(result.data)) return { data: [], cached: false }
    return result as { data: any[]; cached: boolean }
  } catch { return { data: [], cached: false } }
}

export async function fetchPageContentCachedAdmin(slug: string): Promise<{ data: Record<string, string>; cached: boolean }> {
  try {
    return await fetchWithCache('page_admin_' + slug, () => fetchPageContentAdmin(slug))
  } catch { return { data: {}, cached: false } }
}

export async function fetchImagesCached(): Promise<{ data: any[]; cached: boolean }> {
  try {
    return await fetchWithCache('images', () => fetchImages(false))
  } catch { return { data: [], cached: false } }
}

export async function fetchImagesWithDataCached(): Promise<{ data: any[]; cached: boolean }> {
  try {
    return await fetchWithCache('images_data', () => fetchImages(true))
  } catch { return { data: [], cached: false } }
}

export async function fetchUsersCached(): Promise<{ data: any[]; cached: boolean }> {
  try {
    return await fetchWithCache('users', async () => {
      const { data } = await api.get('/auth/users')
      return Array.isArray(data) ? data : []
    })
  } catch { return { data: [], cached: false } }
}

export async function fetchAlunosCached(): Promise<{ data: any[]; cached: boolean }> {
  try {
    return await fetchWithCache('alunos', async () => {
      const { data } = await api.get('/historico-alunos')
      return Array.isArray(data) ? data : []
    })
  } catch { return { data: [], cached: false } }
}

// Module-level eager prefetch
fetchContentCached()
fetchPagesCached()
fetchPageContentCached('home')
