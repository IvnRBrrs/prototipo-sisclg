import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cms_token') || localStorage.getItem('supabase_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const companyId = localStorage.getItem('cms_company_id')
  if (companyId) {
    config.headers['X-Company-Id'] = companyId
  }
  // Pin de tenant do deploy (VITE_TENANT_ORG_ID na Vercel): amarra este
  // frontend à organização dona do pin — o backend valida e resolve.
  const tenantPin = import.meta.env.VITE_TENANT_ORG_ID
  if (tenantPin) {
    config.headers['X-Tenant-Pin'] = tenantPin
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cms_token')
      localStorage.removeItem('supabase_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Content helpers
const ADMIN_CTX = { headers: { 'X-Cms-Ctx': 'admin' } } as const

export async function fetchContent(): Promise<Record<string, string>> {
  const { data } = await api.get('/content')
  return data
}

// Variantes do PAINEL: pedem a própria organização sem a substituição do
// "site principal" (o editor sempre edita o que exibe).
export async function fetchContentAdmin(): Promise<Record<string, string>> {
  const { data } = await api.get('/content', ADMIN_CTX)
  return data
}

export async function updateContent(key: string, value: string) {
  await api.put('/content', { key, value })
}

export async function bulkUpdateContent(entries: Record<string, string>) {
  await api.put('/content/bulk', { entries })
}

// Pages
export async function fetchPages() {
  const { data } = await api.get('/pages')
  return data
}

export async function fetchPagesAdmin() {
  const { data } = await api.get('/pages', ADMIN_CTX)
  return data
}

function normSlug(s: string) { return s.replace(/^\/+|\/+$/g, '') }

export async function fetchPageContent(slug: string): Promise<Record<string, string>> {
  try {
    const { data } = await api.get(`/pages/${normSlug(slug)}/content`)
    return data
  } catch (err) {
    throw err
  }
}

export async function fetchPageContentAdmin(slug: string): Promise<Record<string, string>> {
  try {
    const { data } = await api.get(`/pages/${normSlug(slug)}/content`, ADMIN_CTX)
    return data
  } catch (err) {
    throw err
  }
}

export async function updatePageContent(slug: string, entries: Record<string, string>) {
  await api.put(`/pages/${normSlug(slug)}/content/bulk`, { entries })
}

// Images
export async function uploadImage(filename: string, data: string, type: string, component_type?: string, thumbnail?: string) {
  const { data: result } = await api.post('/images/upload', { filename, data, type, component_type, thumbnail })
  return result
}

export async function fetchImages(includeData = false) {
  const { data } = await api.get(`/images?data=${includeData}`)
  return data
}

export async function fetchImageData(id: string) {
  const { data } = await api.get(`/images/${id}/data`)
  return data
}

export async function updateImageThumbnail(id: string, thumbnail: string) {
  await api.patch(`/images/${id}/thumbnail`, { thumbnail })
}

export async function deleteImage(id: string) {
  await api.delete(`/images/${id}`)
}

export async function fetchAdminPreload() {
  const { data } = await api.get('/admin/preload')
  return data
}

// Messages
export async function submitContactMessage(msg: { name: string; email: string; phone?: string; message: string }) {
  await api.post('/messages', msg)
}

export async function fetchMessages() {
  const { data } = await api.get('/messages')
  return data
}

export async function archiveMessage(id: number) {
  await api.put(`/messages/${id}/archive`)
}

export async function fetchPreEnrollments() {
  const { data } = await api.get('/pre-enrollments')
  return data
}

// Blog
export async function fetchBlogPosts(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, String(v)) })
  const { data } = await api.get(`/blog/posts?${query}`)
  return data
}

// Variante do PAINEL (sem substituição do site principal)
export async function fetchBlogPostsAdmin(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, String(v)) })
  const { data } = await api.get(`/blog/posts?${query}`, ADMIN_CTX)
  return data
}

export async function fetchBlogPost(id: string) {
  const { data } = await api.get(`/blog/posts/${id}`)
  return data
}

export async function fetchBlogPostAdmin(id: string) {
  const { data } = await api.get(`/blog/posts/${id}`, ADMIN_CTX)
  return data
}

export async function createBlogPost(post: Record<string, any>) {
  const { data } = await api.post('/blog/posts', post)
  return data
}

export async function updateBlogPost(id: string, post: Record<string, any>) {
  const { data } = await api.put(`/blog/posts/${id}`, post)
  return data
}

export async function deleteBlogPost(id: string) {
  const { data } = await api.delete(`/blog/posts/${id}`)
  return data
}

export async function fetchBlogTags() {
  const { data } = await api.get('/blog/tags')
  return data
}

export async function fetchBlogAuthors() {
  const { data } = await api.get('/blog/authors')
  return data
}

export async function fetchBlogArchive() {
  const { data } = await api.get('/blog/archive')
  return data
}

// Auth
export async function login(username: string, password: string): Promise<{ token: string; role: string; mustChangePassword: boolean }> {
  const { data } = await api.post('/auth/login', { username, password })
  return { token: data.token, role: data.role, mustChangePassword: data.mustChangePassword }
}

// Backups
export async function createBackup(section_key: string, value: Record<string, string>) {
  const { data } = await api.post('/backups', { section_key, value: JSON.stringify(value) })
  return data
}

export async function fetchBackups(section_key: string) {
  const { data } = await api.get(`/backups/${section_key}`)
  return data
}

// Login Log
export async function fetchLoginLog() {
  const { data } = await api.get('/auth/login-log')
  return data
}

export async function deleteLoginLog(id: number) {
  await api.delete(`/auth/login-log/${id}`)
}

// Organizations (super_admin only)
export interface Organization {
  id: string
  nome: string
  slug: string
  domains: string[]
  settings: Record<string, any>
  status: string
  created_at: string
  provisioned?: number
  tenant_pin?: string
}

export async function fetchOrganizations() {
  const { data } = await api.get('/organizations')
  return data as Organization[]
}

export async function createOrganization(payload: { slug: string; nome: string; domains?: string[]; settings?: Record<string, any> }) {
  const { data } = await api.post('/organizations', payload)
  return data
}

export async function updateOrganization(companyId: string, payload: { nome?: string; domains?: string[]; settings?: Record<string, any>; status?: string }) {
  const { data } = await api.put(`/organizations/${encodeURIComponent(companyId)}`, payload)
  return data
}

export async function runOnboarding(companyId: string, payload: { admin_username?: string; admin_password?: string }) {
  const { data } = await api.post(`/organizations/${encodeURIComponent(companyId)}/onboarding`, payload)
  return data
}

// "Site principal": publica (ativa=true) ou desativa a exibição do conteúdo
// da organização no site principal (domínio que resolve para 'default').
export async function setSitePrincipal(orgId: string | null, ativo: boolean) {
  const { data } = await api.put('/organizations/site-principal', { org_id: orgId, ativo })
  return data as { success: boolean; site_principal: { org_id: string; ativo: boolean } | null }
}

// Regenera o pin de tenant da organização (invalida o pin antigo).
export async function regenerateTenantPin(companyId: string) {
  const { data } = await api.post(`/organizations/${encodeURIComponent(companyId)}/regenerate-pin`)
  return data as { success: boolean; tenant_pin: string }
}
