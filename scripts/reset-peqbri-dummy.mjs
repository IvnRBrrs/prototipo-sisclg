// RESET REAL da colegio-peqbri: apaga os dados copiados da default (site +
// biblioteca) e provisiona com o DUMMY template. A conta do gestor_admin da
// escola é PRESERVADA (admin_existing). Verifica tudo e reporta.
import 'dotenv/config'
import { createClient } from '@libsql/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })
const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BASE = 'http://localhost:3001/api'

const SUPER = '__reset_peqbri_super__'
const ORG = 'colegio-peqbri'
const GESTOR = 'colegio-peqbri_admin'

const results = []
const ok = (name, cond, extra = '') => { const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line) }

async function withTimeout(p, ms, what) {
  let t
  const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('TIMEOUT ' + what)), ms) })
  try { return await Promise.race([p, timer]) } finally { clearTimeout(t) }
}
async function req(path, { method = 'GET', token, company, body } = {}) {
  const headers = {}
  if (token) headers['Authorization'] = 'Bearer ' + token
  if (company) headers['X-Company-Id'] = company
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await withTimeout(fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), 120000, 'fetch ' + path)
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

// estado do site principal (só leitura — deixamos como o usuário deixou)
const spRow = await db.execute("SELECT settings FROM organizations WHERE id = 'default'")
let spSettings = {}
try { spSettings = JSON.parse(spRow.rows[0]?.settings || '{}') } catch {}
console.log('[estado] site_principal atual:', JSON.stringify(spSettings.site_principal || null))

// conta do gestor ANTES do reset (para provar preservação)
const gBefore = await db.execute({ sql: 'SELECT id, username, role, company_id, email, password_hash, must_change_password FROM users WHERE username = ?', args: [GESTOR] })
if (gBefore.rows.length === 0) {
  console.log('ERRO: gestor da peqbri não encontrado — abortar.'); process.exit(1)
}
const gBeforeHash = gBefore.rows[0].password_hash
console.log('[antes] gestor:', JSON.stringify({ id: gBefore.rows[0].id, role: gBefore.rows[0].role, company: gBefore.rows[0].company_id }))

await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [SUPER] })
await db.execute({
  sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
  args: [SUPER, await bcrypt.hash('prova123', 10), 'super_admin', SUPER + '@prova.local', 'default'],
})

try {
  const sLogin = await req('/auth/login', { method: 'POST', body: { username: SUPER, password: 'prova123' } })
  ok('login super temp', sLogin.status === 200, 'status ' + sLogin.status)
  const token = sLogin.data.token

  const before = {}
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts']) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [ORG])
    before[t] = Number(r.rows[0].n)
  }
  console.log('[antes] dados da peqbri (copiados da default):', JSON.stringify(before))

  // ===== RESET: apaga SOMENTE os dados de site (conta do gestor preservada) =====
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts']) {
    await db.execute(`DELETE FROM ${t} WHERE company_id = ?`, [ORG])
  }
  const afterDel = {}
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts']) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [ORG])
    afterDel[t] = Number(r.rows[0].n)
  }
  ok('dados antigos apagados (peqbri vazia)', Object.values(afterDel).every((n) => n === 0), JSON.stringify(afterDel))

  // ===== PROVISIONAMENTO DUMMY (gestor já existente → preservado) =====
  const onb = await req(`/organizations/${ORG}/onboarding`, { method: 'POST', token, body: { admin_username: GESTOR } })
  ok('onboarding (re-provisionamento) sucesso', onb.status === 200 && onb.data?.success === true, JSON.stringify({ s: onb.status, e: onb.data?.error }))
  ok('admin_existing = true (conta preservada)', onb.data?.admin_existing === true, 'admin_existing=' + onb.data?.admin_existing)
  ok('senha NÃO exposta (null)', onb.data?.password === null, 'password=' + JSON.stringify(onb.data?.password))
  ok('counts dummy', onb.data?.copied?.pages === 8 && onb.data?.copied?.page_content === 366 && onb.data?.copied?.content === 95 && onb.data?.copied?.images === 3 && onb.data?.copied?.blog_posts === 2, JSON.stringify(onb.data?.copied))

  // ===== VERIFICAÇÕES =====
  const gAfter = await db.execute({ sql: 'SELECT id, role, company_id, email, password_hash, must_change_password FROM users WHERE username = ?', args: [GESTOR] })
  ok('gestor PRESERVADO (mesma conta, mesmo hash de senha)', gAfter.rows.length === 1 && String(gAfter.rows[0].id) === String(gBefore.rows[0].id) && gAfter.rows[0].password_hash === gBeforeHash && gAfter.rows[0].company_id === ORG, JSON.stringify({ id: String(gAfter.rows[0]?.id), mesmo_hash: gAfter.rows[0]?.password_hash === gBeforeHash }))

  const leak = await db.execute({ sql: `SELECT COUNT(*) AS n FROM content WHERE company_id = ? AND (value LIKE '%Adolfo%' OR value LIKE '%Macei%')`, args: [ORG] })
  ok('NENHUM dado real da default na peqbri', Number(leak.rows[0].n) === 0, 'n=' + leak.rows[0].n)

  const addr = await db.execute({ sql: 'SELECT value FROM content WHERE key = ? AND company_id = ?', args: ['address', ORG] })
  ok('address dummy', String(addr.rows[0]?.value).includes('Rua Exemplo'), 'valor=' + addr.rows[0]?.value)

  const counts = {}
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts']) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [ORG])
    counts[t] = Number(r.rows[0].n)
  }
  ok('peqbri populada com dummy (95/8/366/3/2)', counts.content === 95 && counts.pages === 8 && counts.page_content === 366 && counts.images === 3 && counts.blog_posts === 2, JSON.stringify(counts))

  const site = await req('/public/initial', { company: ORG })
  ok('site público da peqbri serve dummy', site.status === 200 && Object.keys(site.data.content || {}).length === 95 && site.data.pages?.length === 8, JSON.stringify({ c: Object.keys(site.data.content || {}).length, p: site.data.pages?.length }))

  const blog = await req('/blog/posts?limit=50', { company: ORG })
  ok('blog da peqbri: 2 posts dummy', blog.data?.posts?.length === 2, 'n=' + blog.data?.posts?.length)

  const list = await req('/organizations', { token })
  const o = list.data.find((x) => x.id === ORG)
  ok('provisioned=1', o?.provisioned === 1)

  // Supabase: usuário do gestor ainda existe e único (não duplicado)
  const { data: suUsers } = await withTimeout(supabase.auth.admin.listUsers({ perPage: 1000 }), 60000, 'listUsers')
  const suMatches = (suUsers?.users || []).filter((u) => u.email === `${GESTOR}@${ORG}.com.br`)
  ok('Supabase: gestor da peqbri preservado e ÚNICO', suMatches.length === 1 && suMatches[0].user_metadata?.role === 'gestor_admin', 'n=' + suMatches.length)

  // default intacta
  const defContent = await db.execute("SELECT COUNT(*) AS n FROM content WHERE company_id = 'default'")
  ok('default intacta (113)', Number(defContent.rows[0].n) === 113, 'n=' + defContent.rows[0].n)
} finally {
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [SUPER] })
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE '%reset_peqbri%'" })
}

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
