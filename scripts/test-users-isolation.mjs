// Suíte de isolamento por company_id — foco em USUÁRIOS: criação, listagem,
// edição, reset de senha e exclusão; escopos de super_admin (header), gestor
// e editor. Tudo auto-limpante (NET-ZERO).
import 'dotenv/config'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })
const BASE = 'http://localhost:3001/api'

const SUPER = '__iso_super__'
const ORG = 'isotestorg'
const GESTOR = 'isotest_admin'
const GESTOR_EMAIL = `${GESTOR}@${ORG}.com.br`
const EDITOR = 'isotest_editor'
const GESTOR_B = 'isotest_gestorb'
const TARGET_USER = 'isotest_alvo'

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
  const res = await withTimeout(fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), 60000, 'fetch ' + path)
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

const COUNT_TABLES = ['organizations', 'content', 'pages', 'page_content', 'blog_posts', 'images', 'users', 'contact_messages', 'login_log']
async function snapshot() {
  const s = {}
  for (const t of COUNT_TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`)
    s[t] = Number(r.rows[0].n)
  }
  return s
}

async function cleanOrg() {
  await db.execute({ sql: 'DELETE FROM users WHERE username IN (?, ?, ?, ?, ?)', args: [SUPER, GESTOR, EDITOR, GESTOR_B, TARGET_USER] })
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts', 'users']) {
    await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [ORG] }).catch(() => {})
  }
  await db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [ORG] }).catch(() => {})
}

console.log('[setup] pre-cleanup...')
await cleanOrg()
const PRE = await snapshot()
console.log('[setup] snapshot pre:', JSON.stringify(PRE))

// Fixtures: org + gestor (via API) + dados mínimos de content p/ edição do editor
await db.execute({
  sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
  args: [SUPER, await bcrypt.hash('prova123', 10), 'super_admin', SUPER + '@prova.local', 'default'],
})

try {
  const sLogin = await req('/auth/login', { method: 'POST', body: { username: SUPER, password: 'prova123' } })
  ok('login super', sLogin.status === 200, 'status ' + sLogin.status)
  const token = sLogin.data.token

  const cOrg = await req('/organizations', { method: 'POST', token, body: { slug: ORG, nome: 'Iso Test Org' } })
  ok('org criada', cOrg.status === 200, 'status ' + cOrg.status)

  // gestor_admin da org (Turso direto, simulando provisionamento anterior)
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
    args: [GESTOR, await bcrypt.hash('prova123', 10), 'gestor_admin', GESTOR_EMAIL, ORG],
  })
  // um usuário-alvo na org (para testes de edição/reset/exclusão escopados)
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
    args: [TARGET_USER, await bcrypt.hash('prova123', 10), 'editor_blog', TARGET_USER + '@iso.com.br', ORG],
  })

  const gLogin = await req('/auth/login', { method: 'POST', body: { username: GESTOR, password: 'prova123' } })
  ok('login gestor da org', gLogin.status === 200 && gLogin.data.role === 'gestor_admin' && gLogin.data.company_id === ORG, JSON.stringify({ r: gLogin.data?.role, c: gLogin.data?.company_id }))
  const gToken = gLogin.data.token

  // ===== 1. CRIAÇÃO de usuários escopada =====
  const gCreate = await req('/auth/users', { method: 'POST', token: gToken, body: { username: EDITOR, password: 'prova123', role: 'editor_admin', email: EDITOR + '@iso.com.br' } })
  ok('gestor cria usuário → na própria org', gCreate.status === 200, 'status ' + gCreate.status)
  const edRow = await db.execute({ sql: 'SELECT company_id FROM users WHERE username = ?', args: [EDITOR] })
  ok('novo editor com company_id da org', edRow.rows[0]?.company_id === ORG, 'c=' + edRow.rows[0]?.company_id)

  const gCreateSuper = await req('/auth/users', { method: 'POST', token: gToken, body: { username: 'isotest_mau', password: 'prova123', role: 'super_admin' } })
  ok('gestor NÃO cria super_admin (403)', gCreateSuper.status === 403, 'status ' + gCreateSuper.status)

  const eLogin = await req('/auth/login', { method: 'POST', body: { username: EDITOR, password: 'prova123' } })
  const eToken = eLogin.data?.token
  ok('login editor da org', eLogin.status === 200 && eLogin.data.role === 'editor_admin' && eLogin.data.company_id === ORG, JSON.stringify({ r: eLogin.data?.role, c: eLogin.data?.company_id }))
  const eCreate = await req('/auth/users', { method: 'POST', token: eToken, body: { username: 'isotest_editor_cria', password: 'prova123', role: 'editor_blog' } })
  ok('editor NÃO cria usuários (403)', eCreate.status === 403, 'status ' + eCreate.status)

  // super com header da org cria usuário na org (não na default)
  const sCreate = await req('/auth/users', { method: 'POST', token, company: ORG, body: { username: GESTOR_B, password: 'prova123', role: 'gestor_admin', email: GESTOR_B + '@iso.com.br' } })
  ok('super (com header da org) cria usuário na org', sCreate.status === 200, 'status ' + sCreate.status)
  const gbRow = await db.execute({ sql: 'SELECT company_id FROM users WHERE username = ?', args: [GESTOR_B] })
  ok('usuário do super gravado na org', gbRow.rows[0]?.company_id === ORG, 'c=' + gbRow.rows[0]?.company_id)

  // ===== 2. LISTAGEM escopada =====
  const gList = await req('/auth/users', { token: gToken })
  const gListStr = JSON.stringify(gList.data)
  ok('gestor lista usuários: vê os da própria org', gListStr.includes(TARGET_USER) && gListStr.includes(EDITOR), 'len=' + gListStr.length)
  ok('gestor NÃO vê usuários da default', !gListStr.includes('"super_admin"') && !gListStr.includes('"fal"'), '')

  const sListDefault = await req('/auth/users', { token })
  const sListStr = JSON.stringify(sListDefault.data)
  ok('super sem header vê TODAS as orgs (inclui default)', sListStr.includes('"super_admin"'), 'len=' + sListStr.length)

  const sListOrg = await req('/auth/users', { token, company: ORG })
  const sListOrgStr = JSON.stringify(sListOrg.data)
  ok('super com header vê só a org selecionada', sListOrgStr.includes(TARGET_USER) && !sListOrgStr.includes('"coordenador_pedagogico"'), 'len=' + sListOrgStr.length)

  // ===== 3. EDIÇÃO / RESET / EXCLUSÃO escopados =====
  // alvo na DEFAULT p/ tentativa de acesso cross-org (usuário real: coordenador_pedagogico)
  const coordRow = await db.execute({ sql: "SELECT id FROM users WHERE username = 'coordenador_pedagogico'" })
  const coordId = coordRow.rows[0]?.id

  const targetRow = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [TARGET_USER] })
  const targetId = targetRow.rows[0]?.id

  const gEditOther = await req(`/auth/users/${coordId}`, { method: 'PUT', token: gToken, body: { email: 'hack@iso.com.br' } })
  ok('gestor NÃO edita usuário de outra org (404 — não vaza existência)', gEditOther.status === 404, 'status ' + gEditOther.status)

  const gEditOwn = await req(`/auth/users/${targetId}`, { method: 'PUT', token: gToken, body: { email: 'alvo-novo@iso.com.br' } })
  ok('gestor edita usuário da própria org', gEditOwn.status === 200, 'status ' + gEditOwn.status)

  const gResetOther = await req(`/auth/users/${coordId}/reset-password`, { method: 'POST', token: gToken, body: { password: 'hack123' } })
  ok('gestor NÃO reseta senha de outra org (404 — não vaza)', gResetOther.status === 404, 'status ' + gResetOther.status)

  const gResetOwn = await req(`/auth/users/${targetId}/reset-password`, { method: 'POST', token: gToken, body: { password: 'novo123' } })
  ok('gestor reseta senha da própria org', gResetOwn.status === 200, 'status ' + gResetOwn.status)
  const reLogin = await req('/auth/login', { method: 'POST', body: { username: TARGET_USER, password: 'novo123' } })
  ok('senha resetada funciona (login alvo)', reLogin.status === 200, 'status ' + reLogin.status)

  const gDelOther = await req(`/auth/users/${coordId}`, { method: 'DELETE', token: gToken })
  ok('gestor NÃO exclui usuário de outra org (404 — não vaza existência)', gDelOther.status === 404, 'status ' + gDelOther.status)

  const coordStill = await db.execute({ sql: "SELECT COUNT(*) AS n FROM users WHERE username = 'coordenador_pedagogico' AND email LIKE '%colegiostjm%'" })
  ok('default INTOCADA nas tentativas cross-org', Number(coordStill.rows[0].n) === 1, 'n=' + coordStill.rows[0].n)

  // ===== 4. ESCRITA de conteúdo escopada pelo token (mesmo com header de outra org) =====
  await db.execute({ sql: 'INSERT INTO content (key, value, company_id) VALUES (?, ?, ?)', args: ['iso_marker', 'org-value', ORG] })
  const ePut = await req('/content', { method: 'PUT', token: eToken, company: 'default', body: { key: 'iso_editor_test', value: 'editor-write' } })
  ok('editor escreve (PUT aceito)', ePut.status === 200, 'status ' + ePut.status)
  const edOrgRow = await db.execute({ sql: "SELECT COUNT(*) AS n FROM content WHERE key = 'iso_editor_test' AND company_id = ?", args: [ORG] })
  const edDefRow = await db.execute({ sql: "SELECT COUNT(*) AS n FROM content WHERE key = 'iso_editor_test' AND company_id = 'default'" })
  ok('escrita do editor caiu na PRÓPRIA org (não na default)', Number(edOrgRow.rows[0].n) === 1 && Number(edDefRow.rows[0].n) === 0, JSON.stringify({ org: edOrgRow.rows[0].n, def: edDefRow.rows[0].n }))

  // gestor NÃO edita conteúdo do site (papel de editor)
  const gPut = await req('/content', { method: 'PUT', token: gToken, body: { key: 'iso_gestor_test', value: 'x' } })
  ok('gestor NÃO edita conteúdo do site (403)', gPut.status === 403, 'status ' + gPut.status)

  // ===== 5. LOGIN continua livre (TENANT_ENFORCE off) mas token carrega a org =====
  const tLogin = await req('/auth/login', { method: 'POST', body: { username: TARGET_USER, password: 'novo123' } })
  ok('alvo (editor_blog) loga com company da org', tLogin.status === 200 && tLogin.data.company_id === ORG, JSON.stringify({ c: tLogin.data?.company_id }))
} finally {
  console.log('[cleanup]...')
  await cleanOrg()
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE 'isotest%' OR username LIKE ?", args: [SUPER] })
}

const POST = await snapshot()
console.log('[audit] snapshot post:', JSON.stringify(POST))
const diff = []
for (const k of Object.keys(PRE)) {
  if (String(PRE[k]) !== String(POST[k])) diff.push(`${k}: ${PRE[k]} -> ${POST[k]}`)
}
ok('NET-ZERO: banco idêntico ao início', diff.length === 0, diff.join('; '))
ok('BASELINE users=14', POST.users === 14, 'n=' + POST.users)
ok('BASELINE orgs=2', POST.organizations === 2, 'n=' + POST.organizations)

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
