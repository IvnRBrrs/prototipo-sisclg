import 'dotenv/config'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })
const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BASE = 'http://localhost:3001/api'

const SUPER = '__prova_dummy_super__'
const ORG = 'provadummyorg'
const GESTOR = ORG + '_admin'
const GESTOR_EMAIL = `${GESTOR}@${ORG}.com.br`
const EDITOR = 'provadummy_editor'
// valor real da default para checar AUSÊNCIA na org (dado sensível)
const REAL_DEFAULT_ADDRESS = 'Adolfo'

const results = []
const ok = (name, cond, extra = '') => { const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line) }

async function withTimeout(p, ms, what) {
  let t
  const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('TIMEOUT ' + what + ' (' + ms + 'ms)')), ms) })
  try { return await Promise.race([p, timer]) } finally { clearTimeout(t) }
}
async function req(path, { method = 'GET', token, company, adminCtx, body } = {}) {
  const headers = {}
  if (token) headers['Authorization'] = 'Bearer ' + token
  if (company) headers['X-Company-Id'] = company
  if (adminCtx) headers['X-Cms-Ctx'] = 'admin'
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await withTimeout(fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), 120000, 'fetch ' + path)
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}
const suList = () => withTimeout(supabase.auth.admin.listUsers({ perPage: 1000 }), 60000, 'supabase listUsers')
const suDelete = (id) => withTimeout(supabase.auth.admin.deleteUser(id), 30000, 'supabase deleteUser')

const COUNT_TABLES = ['organizations', 'content', 'pages', 'page_content', 'blog_posts', 'images', 'users', 'contact_messages', 'pre_enrollments', 'content_backups', 'login_log']
async function snapshot() {
  const s = {}
  for (const t of COUNT_TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`)
    s[t] = Number(r.rows[0].n)
  }
  const dContent = await db.execute("SELECT COUNT(*) AS n FROM content WHERE company_id = 'default'")
  s.def_content = Number(dContent.rows[0].n)
  return s
}

async function cleanOrg() {
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [SUPER] })
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [GESTOR] })
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [EDITOR] })
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts', 'users']) {
    await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [ORG] }).catch(() => {})
  }
  await db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [ORG] }).catch(() => {})
}
async function clearSitePrincipal() {
  const cur = await db.execute("SELECT settings FROM organizations WHERE id = 'default'")
  let settings = {}
  try { settings = JSON.parse(cur.rows[0]?.settings || '{}') } catch {}
  delete settings.site_principal
  await db.execute({ sql: "UPDATE organizations SET settings = ? WHERE id = 'default'", args: [JSON.stringify(settings)] })
}

console.log('[setup] pre-cleanup...')
await cleanOrg()
await clearSitePrincipal()
{
  const { data: preUsers } = await suList()
  const pre = preUsers?.users?.find?.((u) => u.email === GESTOR_EMAIL)
  if (pre) await suDelete(pre.id)
}

const PRE = await snapshot()
console.log('[setup] snapshot pre:', JSON.stringify(PRE))

await db.execute({
  sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
  args: [SUPER, await bcrypt.hash('prova123', 10), 'super_admin', SUPER + '@prova.local', 'default'],
})

try {
  const login = await req('/auth/login', { method: 'POST', body: { username: SUPER, password: 'prova123' } })
  ok('login super temp', login.status === 200, 'status ' + login.status)
  const token = login.data.token

  // ===== 1. org criada VIA API nasce COMPLETAMENTE VAZIA =====
  const cOrg = await req('/organizations', { method: 'POST', token, body: { slug: ORG, nome: 'Prova Dummy' } })
  ok('org criada via API', cOrg.status === 200, JSON.stringify(cOrg.data))
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts', 'users']) {
    const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, args: [ORG] })
    ok(`org nova VAZIA: ${t} = 0`, Number(r.rows[0].n) === 0, 'n=' + r.rows[0].n)
  }
  const siteVazio = await req('/public/initial', { company: ORG })
  ok('site da org vazia: vazio (sem fallback da default)', siteVazio.status === 200 && Object.keys(siteVazio.data.content || {}).length === 0 && (siteVazio.data.pages || []).length === 0, JSON.stringify({ c: Object.keys(siteVazio.data.content || {}).length, p: (siteVazio.data.pages || []).length }))

  // ===== 2. provisionamento DUMMY =====
  const onb = await req(`/organizations/${ORG}/onboarding`, { method: 'POST', token, body: { admin_password: 'prova1234' } })
  ok('onboarding dummy sucesso', onb.status === 200 && onb.data?.success === true, JSON.stringify({ s: onb.status, e: onb.data?.error }))
  ok('counts dummy', onb.data?.copied?.pages === 8 && onb.data?.copied?.page_content === 366 && onb.data?.copied?.content === 95 && onb.data?.copied?.images === 3 && onb.data?.copied?.blog_posts === 2, JSON.stringify(onb.data?.copied))
  ok('role gestor_admin', onb.data?.role === 'gestor_admin', 'role=' + onb.data?.role)
  ok('supabase ok', onb.data?.supabase?.ok === true, JSON.stringify(onb.data?.supabase))

  const orgAddr = await db.execute({ sql: 'SELECT value FROM content WHERE key = ? AND company_id = ?', args: ['address', ORG] })
  ok('address dummy (sem dado real da default)', orgAddr.rows.length === 1 && String(orgAddr.rows[0].value).includes('Rua Exemplo') && !String(orgAddr.rows[0].value).includes(REAL_DEFAULT_ADDRESS), 'valor=' + orgAddr.rows[0]?.value)

  const realLeak = await db.execute({ sql: `SELECT COUNT(*) AS n FROM content WHERE company_id = ? AND (value LIKE ? OR value LIKE ?)`, args: [ORG, '%' + REAL_DEFAULT_ADDRESS + '%', '%Macei%'] })
  ok('NENHUM valor de content contém dado real (Adolfo/Maceió)', Number(realLeak.rows[0].n) === 0, 'n=' + realLeak.rows[0].n)

  const orgVer = await db.execute({ sql: "SELECT value FROM content WHERE key = '_content_version' AND company_id = ?", args: [ORG] })
  ok('_content_version da org = 1', orgVer.rows[0]?.value === '1', 'v=' + orgVer.rows[0]?.value)
  const orgColor = await db.execute({ sql: 'SELECT value FROM content WHERE key = ? AND company_id = ?', args: ['color_primary', ORG] })
  const defColor = await db.execute({ sql: "SELECT value FROM content WHERE key = 'color_primary' AND company_id = 'default'" })
  ok('paleta de tema preservada (color_primary igual)', orgColor.rows[0]?.value === defColor.rows[0]?.value, String(orgColor.rows[0]?.value))

  const gestorRow = await db.execute({ sql: 'SELECT role, company_id, must_change_password FROM users WHERE username = ?', args: [GESTOR] })
  ok('gestor_admin no Turso', gestorRow.rows.length === 1 && gestorRow.rows[0].role === 'gestor_admin' && gestorRow.rows[0].company_id === ORG && Number(gestorRow.rows[0].must_change_password) === 1, JSON.stringify(gestorRow.rows[0]))
  const { data: suUsers } = await suList()
  const suG = suUsers?.users?.find?.((u) => u.email === GESTOR_EMAIL)
  ok('Supabase metadata gestor_admin', !!suG && suG.user_metadata?.role === 'gestor_admin' && suG.user_metadata?.company_id === ORG, JSON.stringify({ m: suG?.user_metadata }))

  // ===== 3. site da org provisionada: SOMENTE dados próprios (dummy) =====
  const orgSite = await req('/content', { company: ORG })
  ok('site da org: 95 chaves dummy (sem fallback)', Object.keys(orgSite.data).length === 95, 'n=' + Object.keys(orgSite.data).length)
  ok('site da org: address dummy presente', String(orgSite.data.address).includes('Rua Exemplo'))
  const orgPages = await req('/pages', { company: ORG })
  ok('site da org: 8 páginas dummy', orgPages.data?.length === 8, 'n=' + orgPages.data?.length)
  const orgBlog = await req('/blog/posts?limit=50', { company: ORG })
  ok('site da org: 2 posts dummy (blog próprio)', orgBlog.data?.posts?.length === 2, 'n=' + orgBlog.data?.posts?.length)
  const adminView = await req('/content', { token, company: ORG, adminCtx: true })
  ok('painel da org: dados próprios (95, sem fallback)', Object.keys(adminView.data).length === 95, 'n=' + Object.keys(adminView.data).length)

  // ===== 4. provisioned + idempotência =====
  const list1 = await req('/organizations', { token })
  const o1 = list1.data.find((o) => o.id === ORG)
  ok('provisioned=1', o1?.provisioned === 1)
  const again = await req(`/organizations/${ORG}/onboarding`, { method: 'POST', token, body: {} })
  ok('onboarding 2x rejeitado (400)', again.status === 400, 'status ' + again.status)

  // ===== 5. P2: criação de usuários escopada pela org selecionada =====
  const newUser = await req('/auth/users', { method: 'POST', token, company: ORG, body: { username: EDITOR, password: 'prova123', role: 'editor_admin', email: EDITOR + '@exemplo.com.br' } })
  ok('super cria usuário dentro da org', newUser.status === 200, 'status ' + newUser.status + ' ' + JSON.stringify(newUser.data))
  const editorRow = await db.execute({ sql: 'SELECT company_id, role FROM users WHERE username = ?', args: [EDITOR] })
  ok('novo usuário gravado com company_id da ORG', editorRow.rows.length === 1 && editorRow.rows[0].company_id === ORG && editorRow.rows[0].role === 'editor_admin', JSON.stringify(editorRow.rows[0]))
  const usersList = await req('/auth/users', { token, company: ORG })
  const listStr = JSON.stringify(usersList.data)
  ok('lista de usuários escopada à org (editor listado, sem usuários da default)', listStr.includes(EDITOR) && !listStr.includes('"coordenador_pedagogico"') && !listStr.includes('"super_admin"'), 'len=' + listStr.length)

  // gestor da escola cria usuário na PRÓPRIA escola
  const gLogin = await req('/auth/login', { method: 'POST', body: { username: GESTOR, password: 'prova1234' } })
  const gToken = gLogin.data?.token
  const gestorCreate = await req('/auth/users', { method: 'POST', token: gToken, body: { username: 'provadummy_gestor_cria', password: 'prova123', role: 'editor_blog', email: 'x@exemplo.com.br' } })
  ok('gestor cria usuário na própria escola', gestorCreate.status === 200, 'status ' + gestorCreate.status)
  const gRow = await db.execute({ sql: 'SELECT company_id FROM users WHERE username = ?', args: ['provadummy_gestor_cria'] })
  ok('usuário do gestor na própria org', gRow.rows[0]?.company_id === ORG, 'c=' + gRow.rows[0]?.company_id)

  // ===== 6. site principal publicado com a org: dummy + fallback default =====
  const pub = await req('/organizations/site-principal', { method: 'PUT', token, body: { org_id: ORG, ativo: true } })
  ok('publica no site principal', pub.status === 200, 'status ' + pub.status)
  const main = await req('/content')
  ok('site principal: address da org dummy', String(main.data.address).includes('Rua Exemplo'), 'valor=' + main.data.address)
  ok('site principal: fallback da default para chaves faltantes', Object.keys(main.data).length >= PRE.def_content, 'n=' + Object.keys(main.data).length + ' vs ' + PRE.def_content)
  const mainBlog = await req('/blog/posts?limit=50')
  ok('site principal: blog da org publicada (2 posts dummy)', mainBlog.data?.posts?.length === 2, 'n=' + mainBlog.data?.posts?.length)
  const off = await req('/organizations/site-principal', { method: 'PUT', token, body: { org_id: ORG, ativo: false } })
  ok('despublica', off.status === 200, 'status ' + off.status)

  // ===== 7. limpeza =====
  const del = await req(`/organizations/${ORG}`, { method: 'DELETE', token })
  ok('DELETE org (cascata)', del.status === 200, JSON.stringify(del.data))
  const { data: suAfter } = await suList()
  const suDel = suAfter?.users?.find?.((u) => u.email === GESTOR_EMAIL)
  if (suDel) {
    const { error } = await suDelete(suDel.id)
    ok('usuário Supabase removido', !error, error?.message || '')
  } else {
    ok('usuário Supabase removido', false, 'não encontrado')
  }
} finally {
  console.log('[cleanup]...')
  await cleanOrg()
  await db.execute({ sql: "DELETE FROM users WHERE username = 'provadummy_gestor_cria'" })
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE '%prova_dummy%' OR username LIKE ? OR username LIKE ?", args: [GESTOR, EDITOR] })
  await clearSitePrincipal()
}

const POST = await snapshot()
console.log('[audit] snapshot post:', JSON.stringify(POST))
const diff = []
for (const k of Object.keys(PRE)) {
  if (String(PRE[k]) !== String(POST[k])) diff.push(`${k}: ${PRE[k]} -> ${POST[k]}`)
}
ok('NET-ZERO: banco idêntico ao início', diff.length === 0, diff.join('; '))
ok('BASELINE orgs=2', POST.organizations === 2, 'n=' + POST.organizations)
ok('BASELINE default content=' + PRE.def_content, POST.def_content === PRE.def_content, 'n=' + POST.def_content)

const peq = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM content WHERE company_id = ?', args: ['colegio-peqbri'] })
ok('colegio-peqbri com dummy data (95, pós-reset)', Number(peq.rows[0].n) === 95, 'n=' + peq.rows[0].n)
const peqLeak = await db.execute({ sql: "SELECT COUNT(*) AS n FROM content WHERE company_id = 'colegio-peqbri' AND (value LIKE '%Adolfo%' OR value LIKE '%Macei%')", args: [] })
ok('colegio-peqbri sem dados reais da default', Number(peqLeak.rows[0].n) === 0, 'n=' + peqLeak.rows[0].n)

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
