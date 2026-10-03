// E2E do sistema de Pin de Tenant — DOIS servidores:
//   A (3001): sem TENANT_PINNED_ORG → comportamento clássico + pin vindo do frontend
//   B (3002): com TENANT_PINNED_ORG=<pin da org de teste> → deploy pinado ABSOLUTO
// Cobre: renderização sem falhas da org pinada (content/initial/forms), pin
// absoluto contra headers forjados, super_admin trocando de org no deploy
// pinado, mismatch frontend≠backend, e o comportamento sem pin preservado.
import 'dotenv/config'
import { createClient } from '@libsql/client'
import { spawn } from 'child_process'
import bcrypt from 'bcryptjs'
import { appendFileSync, writeFileSync } from 'fs'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })

const SUPER = '__pin_super__'
const ORG = 'pintestorg'
const MSG_EMAIL = 'pin-test@prova.local'
const MARKER_KEY = '__pin_marker__'
const MARKER_VAL = 'conteudo-da-org-pinada'
const PIN_LOG = 'probe-pin.log'

const results = []
const ok = (name, cond, extra = '') => { const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line) }

async function withTimeout(p, ms, what) {
  let t
  const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('TIMEOUT ' + what)), ms) })
  try { return await Promise.race([p, timer]) } finally { clearTimeout(t) }
}
function req(base, path, { method = 'GET', token, company, pinHeader, secFetchSite, body } = {}) {
  const headers = {}
  if (token) headers['Authorization'] = 'Bearer ' + token
  if (company) headers['X-Company-Id'] = company
  if (pinHeader) headers['X-Tenant-Pin'] = pinHeader
  if (secFetchSite) headers['Sec-Fetch-Site'] = secFetchSite
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  return withTimeout(fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), 30000, 'fetch ' + path)
    .then(async (res) => { let data = null; try { data = await res.json() } catch { } return { status: res.status, data } })
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

function startServer(port, env, logFile) {
  writeFileSync(logFile, '')
  const child = spawn(process.execPath, ['scripts/probe-server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })
  child.stdout.on('data', (d) => appendFileSync(logFile, d))
  child.stderr.on('data', (d) => appendFileSync(logFile, d))
  return child
}
async function waitHealth(base, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(base + '/keep-alive')
      if (r.ok) return true
    } catch { }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function cleanup() {
  await db.execute({ sql: 'DELETE FROM users WHERE username = ?', args: [SUPER] })
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts', 'users']) {
    await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [ORG] }).catch(() => { })
  }
  await db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [ORG] }).catch(() => { })
  await db.execute({ sql: 'DELETE FROM contact_messages WHERE email = ?', args: [MSG_EMAIL] })
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE '%__pin_super%'" })
}

console.log('[setup] pre-cleanup...')
await cleanup()
const PRE = await snapshot()
console.log('[setup] snapshot pre (limpo):', JSON.stringify(PRE))

// ---------- fixtures ----------
await db.execute({
  sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
  args: [SUPER, await bcrypt.hash('prova123', 10), 'super_admin', SUPER + '@prova.local', 'default'],
})

const A = 'http://localhost:3001/api'   // sem pin
const B = 'http://localhost:3002/api'   // pinado (TENANT_PINNED_ORG)

const serverA = startServer(3001, {}, 'probe-a.log')
if (!(await waitHealth(A))) { console.log('FATAL: server A não subiu'); process.exit(1) }
console.log('[setup] server A (sem pin) no ar')

const login = await req(A, '/auth/login', { method: 'POST', body: { username: SUPER, password: 'prova123' } })
ok('login super temp', login.status === 200, 'status ' + login.status)
const token = login.data.token

const cOrg = await req(A, '/organizations', { method: 'POST', token, body: { slug: ORG, nome: 'Pin Test Org' } })
ok('org criada via API com pin gerado', cOrg.status === 200 && !!cOrg.data?.tenant_pin, 'pin=' + String(cOrg.data?.tenant_pin).slice(0, 10) + '…')
const PIN = cOrg.data?.tenant_pin

await db.execute({ sql: 'INSERT INTO content (key, value, company_id) VALUES (?, ?, ?)', args: [MARKER_KEY, MARKER_VAL, ORG] })

// server B com o pin da org de teste
const serverB = startServer(3002, { TENANT_PINNED_ORG: PIN }, PIN_LOG)
if (!(await waitHealth(B))) { console.log('FATAL: server B não subiu'); process.exit(1) }
console.log('[setup] server B (TENANT_PINNED_ORG ativo) no ar')

try {
  // ===== 1. DEPLOY PINADO RENDERIZA A ORG DO PIN — SEM FALHAS =====
  const c1 = await req(B, '/content')
  ok('PINADO: GET /content sem header serve a org do pin', c1.status === 200 && c1.data[MARKER_KEY] === MARKER_VAL, JSON.stringify(Object.keys(c1.data || {})))
  const ini1 = await req(B, '/public/initial')
  ok('PINADO: /public/initial serve a org do pin', ini1.status === 200 && ini1.data.content?.[MARKER_KEY] === MARKER_VAL, 'keys=' + Object.keys(ini1.data.content || {}).length)
  const theme1 = await req(B, '/public/theme')
  ok('PINADO: /public/theme identifica a org do pin', theme1.data?.id === ORG, 'id=' + theme1.data?.id)
  const keep = await req(B, '/keep-alive')
  ok('PINADO: keep-alive do pin responde', keep.status === 200 && keep.data?.ok === true, 'status ' + keep.status)

  // ===== 2. FORMULÁRIOS caem na org pinada =====
  const msg = await req(B, '/messages', { method: 'POST', body: { name: 'Teste Pin', email: MSG_EMAIL, message: 'form no deploy pinado' } })
  ok('PINADO: form de contato aceito', msg.status === 200 || msg.status === 201, 'status ' + msg.status)
  const msgOrg = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM contact_messages WHERE email = ? AND company_id = ?', args: [MSG_EMAIL, ORG] })
  const msgDef = await db.execute({ sql: "SELECT COUNT(*) AS n FROM contact_messages WHERE email = ? AND company_id = 'default'", args: [MSG_EMAIL] })
  ok('PINADO: mensagem caiu NA ORG DO PIN (não na default)', Number(msgOrg.rows[0].n) === 1 && Number(msgDef.rows[0].n) === 0, JSON.stringify({ org: msgOrg.rows[0].n, def: msgDef.rows[0].n }))

  // ===== 3. PIN ABSOLUTO: header forjado de não-super NÃO move a resolução =====
  const forged = await req(B, '/content', { company: 'colegio-peqbri' })
  ok('PINADO: X-Company-Id forjado (sem super) NÃO muda a org', forged.status === 200 && forged.data[MARKER_KEY] === MARKER_VAL, 'tem marker=' + (forged.data[MARKER_KEY] !== undefined))
  const forgedHost = await fetch(B + '/content', { headers: { Host: 'colegiostjm.vercel.app' } }).then(r => r.json())
  ok('PINADO: host conhecido também não move (pin absoluto)', forgedHost[MARKER_KEY] === MARKER_VAL, '')

  // ===== 4. SUPER_ADMIN pode escolher outra org no deploy pinado =====
  const superSwitch = await req(B, '/content', { token, company: 'colegio-peqbri' })
  ok('PINADO: super + X-Company-Id troca de org (peqbri)', superSwitch.status === 200 && superSwitch.data.address?.includes('Rua Exemplo') && superSwitch.data[MARKER_KEY] === undefined, 'address=' + String(superSwitch.data.address || '').slice(0, 20))

  // ===== 5. MISMATCH frontend≠backend: backend vence + erro no log =====
  const mism = await req(B, '/content', { pinHeader: 'pin-errado-123' })
  ok('PINADO: pin do frontend errado → backend vence (org do pin)', mism.status === 200 && mism.data[MARKER_KEY] === MARKER_VAL, '')
  const pinLog = await import('fs').then(m => m.readFileSync(PIN_LOG, 'utf8'))
  ok('PINADO: mismatch logado como erro no servidor', pinLog.includes('difere do TENANT_PINNED_ORG'), '')

  // ===== 6. SEM PIN no backend: comportamento clássico preservado =====
  const def1 = await req(A, '/content')
  ok('SEM PIN: sem header continua servindo default', def1.status === 200 && def1.data[MARKER_KEY] === undefined && Object.keys(def1.data).length > 100, 'keys=' + Object.keys(def1.data).length)
  const byPinHeader = await req(A, '/content', { pinHeader: PIN })
  ok('SEM PIN: X-Tenant-Pin do frontend resolve a org dona do pin (header ausente = cliente direto/navegador antigo)', byPinHeader.status === 200 && byPinHeader.data[MARKER_KEY] === MARKER_VAL, '')
  const byPinSameOrigin = await req(A, '/content', { pinHeader: PIN, secFetchSite: 'same-origin' })
  ok('SEM PIN: pin com Sec-Fetch-Site same-origin (navegador legítimo) resolve', byPinSameOrigin.data[MARKER_KEY] === MARKER_VAL, '')
  const byPinCrossSite = await req(A, '/content', { pinHeader: PIN, secFetchSite: 'cross-site' })
  ok('SEM PIN: pin em requisição cross-site de navegador é BLOQUEADO (cai p/ default)', byPinCrossSite.status === 200 && byPinCrossSite.data[MARKER_KEY] === undefined && Object.keys(byPinCrossSite.data).length > 100, 'keys=' + Object.keys(byPinCrossSite.data).length)
  const byPinSameSite = await req(A, '/content', { pinHeader: PIN, secFetchSite: 'same-site' })
  ok('SEM PIN: pin com Sec-Fetch-Site same-site (subdomínio) resolve', byPinSameSite.data[MARKER_KEY] === MARKER_VAL, '')
  const superHdr = await req(A, '/content', { token, company: ORG })
  ok('SEM PIN: super + header continua funcionando (clássico)', superHdr.data[MARKER_KEY] === MARKER_VAL, '')

  // ===== 7. regenerate-pin =====
  const regen = await req(A, `/organizations/${ORG}/regenerate-pin`, { method: 'POST', token })
  ok('regenerate-pin gera novo pin', regen.status === 200 && !!regen.data?.tenant_pin && regen.data.tenant_pin !== PIN, 'novo=' + String(regen.data?.tenant_pin).slice(0, 10) + '…')
  const orgRow = await db.execute({ sql: 'SELECT tenant_pin FROM organizations WHERE id = ?', args: [ORG] })
  ok('pin novo persistido no banco', orgRow.rows[0]?.tenant_pin === regen.data?.tenant_pin, '')
  const oldPinResolved = await req(A, '/content', { pinHeader: PIN })
  ok('pin ANTIGO invalidado imediatamente (não resolve mais)', oldPinResolved.data[MARKER_KEY] === undefined, '')
  const newPinResolved = await req(A, '/content', { pinHeader: regen.data.tenant_pin })
  ok('pin NOVO resolve a org', newPinResolved.data[MARKER_KEY] === MARKER_VAL, '')
} finally {
  console.log('[cleanup]...')
  serverA.kill()
  serverB.kill()
  await cleanup()
}

const POST = await snapshot()
console.log('[audit] snapshot post:', JSON.stringify(POST))
const diff = []
for (const k of Object.keys(PRE)) {
  if (String(PRE[k]) !== String(POST[k])) diff.push(`${k}: ${PRE[k]} -> ${POST[k]}`)
}
ok('NET-ZERO: banco idêntico ao início', diff.length === 0, diff.join('; '))
ok('BASELINE orgs=2', POST.organizations === 2, 'n=' + POST.organizations)
ok('BASELINE content=209 (V17 aplicada)', POST.content === 209, 'n=' + POST.content)

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
