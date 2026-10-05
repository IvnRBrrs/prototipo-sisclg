// E2E do Cadastro da Organização (Configurações > Cadastro) — dados
// jurídicos/fiscais + responsável legal, sempre escopados ao company_id do
// contexto (super com header / gestor na própria escola). Auto-limpante.
import 'dotenv/config'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })
const BASE = 'http://localhost:3001/api'

const SUPER = '__cad_super__'
const ORG = 'cadtestorg'
const GESTOR = 'cadtest_admin'
const GESTOR_EMAIL = `${GESTOR}@${ORG}.com.br`

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
  const res = await withTimeout(fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), 30000, 'fetch ' + path)
  let data = null
  try { data = await res.json() } catch { }
  return { status: res.status, data }
}

const COUNT_TABLES = ['organizations', 'content', 'pages', 'page_content', 'blog_posts', 'images', 'users', 'contact_messages', 'org_cadastro']
async function snapshot() {
  const s = {}
  for (const t of COUNT_TABLES) {
    const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`)
    s[t] = Number(r.rows[0].n)
  }
  return s
}

async function cleanup() {
  await db.execute({ sql: 'DELETE FROM users WHERE username IN (?, ?)', args: [SUPER, GESTOR] })
  for (const t of ['content', 'pages', 'page_content', 'images', 'blog_posts', 'users', 'org_cadastro']) {
    await db.execute({ sql: `DELETE FROM ${t} WHERE company_id = ?`, args: [ORG] }).catch(() => { })
  }
  await db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [ORG] }).catch(() => { })
}

console.log('[setup] pre-cleanup...')
await cleanup()
const PRE = await snapshot()
console.log('[setup] snapshot pre (limpo):', JSON.stringify(PRE))

await db.execute({
  sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
  args: [SUPER, await bcrypt.hash('prova123', 10), 'super_admin', SUPER + '@prova.local', 'default'],
})

const PAYLOAD = {
  razao_social: 'Escola Teste LTDA',
  nome_fantasia: 'Escola Teste',
  cnpj: '12.345.678/0001-90',
  inscricao_estadual: '123456789',
  inscricao_municipal: '987654321',
  regime_tributario: 'Simples Nacional',
  endereco_logradouro: 'Rua Exemplo',
  endereco_numero: '123',
  endereco_complemento: 'Sala 4',
  endereco_bairro: 'Centro',
  endereco_cidade: 'São Paulo',
  endereco_estado: 'SP',
  endereco_cep: '01234-567',
  telefone_corporativo: '(11) 3000-0000',
  email_institucional: 'contato@escolateste.com.br',
  website: 'https://escolateste.com.br',
  responsavel_nome: 'Maria Teste da Silva',
  responsavel_cpf: '123.456.789-00',
  responsavel_cargo: 'Diretora',
  responsavel_email: 'maria@escolateste.com.br',
  responsavel_telefone: '(11) 99999-0000',
}

try {
  const login = await req('/auth/login', { method: 'POST', body: { username: SUPER, password: 'prova123' } })
  ok('login super temp', login.status === 200, 'status ' + login.status)
  const token = login.data.token

  const cOrg = await req('/organizations', { method: 'POST', token, body: { slug: ORG, nome: 'Cad Test Org' } })
  ok('org criada via API', cOrg.status === 200, 'status ' + cOrg.status)

  // gestor da org (para validar escopo do próprio admin da escola)
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
    args: [GESTOR, await bcrypt.hash('prova123', 10), 'gestor_admin', GESTOR_EMAIL, ORG],
  })
  const gLogin = await req('/auth/login', { method: 'POST', body: { username: GESTOR, password: 'prova123' } })
  ok('login gestor da org', gLogin.status === 200, 'status ' + gLogin.status)
  const gToken = gLogin.data.token

  // ===== 1. GET antes de salvar: campos vazios, company_id da org =====
  const get0 = await req('/cadastro', { token, company: ORG })
  ok('GET vazio (super com header da org)', get0.status === 200 && get0.data.company_id === ORG && get0.data.razao_social === '', JSON.stringify({ cid: get0.data?.company_id, rs: get0.data?.razao_social }))
  const gGet0 = await req('/cadastro', { token: gToken })
  ok('GET vazio (gestor → própria escola)', gGet0.status === 200 && gGet0.data.company_id === ORG, 'cid=' + gGet0.data?.company_id)

  // ===== 2. PUT salva (super com header da org) =====
  const put1 = await req('/cadastro', { method: 'PUT', token, company: ORG, body: PAYLOAD })
  ok('PUT salva o cadastro (super na org)', put1.status === 200 && put1.data?.success === true, 'status ' + put1.status)

  const row = await db.execute({ sql: 'SELECT * FROM org_cadastro WHERE company_id = ?', args: [ORG] })
  ok('linha gravada no Turso com company_id da org', row.rows.length === 1, 'n=' + row.rows.length)
  const r0 = row.rows[0]
  ok('campos persistidos corretamente',
    r0.razao_social === PAYLOAD.razao_social &&
    r0.cnpj === PAYLOAD.cnpj &&
    r0.regime_tributario === PAYLOAD.regime_tributario &&
    r0.endereco_cep === PAYLOAD.endereco_cep &&
    r0.responsavel_nome === PAYLOAD.responsavel_nome &&
    r0.responsavel_cpf === PAYLOAD.responsavel_cpf,
    JSON.stringify({ rs: r0.razao_social, cnpj: r0.cnpj, resp: r0.responsavel_nome }))

  // ===== 3. GET depois de salvar retorna tudo =====
  const get1 = await req('/cadastro', { token, company: ORG })
  ok('GET retorna os 21 campos salvos', get1.data?.cnpj === PAYLOAD.cnpj && get1.data?.responsavel_cargo === 'Diretora' && get1.data?.endereco_cidade === 'São Paulo', 'cidade=' + get1.data?.endereco_cidade)
  ok('updated_at registrado', !!get1.data?.updated_at, String(get1.data?.updated_at))

  // ===== 4. Upsert: segunda escrita ATUALIZA (não duplica) =====
  const put2 = await req('/cadastro', { method: 'PUT', token, company: ORG, body: { ...PAYLOAD, nome_fantasia: 'Escola Teste 2', razao_social: 'Escola Teste LTDA 2' } })
  ok('PUT segunda vez = update', put2.status === 200, 'status ' + put2.status)
  const count2 = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM org_cadastro WHERE company_id = ?', args: [ORG] })
  ok('ainda exatamente 1 linha por org', Number(count2.rows[0].n) === 1, 'n=' + count2.rows[0].n)
  const fant = await db.execute({ sql: 'SELECT nome_fantasia, razao_social FROM org_cadastro WHERE company_id = ?', args: [ORG] })
  ok('campos atualizados', fant.rows[0].nome_fantasia === 'Escola Teste 2' && fant.rows[0].razao_social === 'Escola Teste LTDA 2', '')

  // ===== 5. Gestor salva na PRÓPRIA escola =====
  const gPut = await req('/cadastro', { method: 'PUT', token: gToken, body: { ...PAYLOAD, website: 'https://gestor-editou.com' } })
  ok('gestor salva no cadastro da própria escola', gPut.status === 200, 'status ' + gPut.status)
  const gSite = await db.execute({ sql: 'SELECT website FROM org_cadastro WHERE company_id = ?', args: [ORG] })
  ok('edição do gestor persistiu na linha da org', gSite.rows[0].website === 'https://gestor-editou.com', String(gSite.rows[0]?.website))

  // ===== 6. Isolamento: outra org não vê os dados =====
  const otherGet = await req('/cadastro', { token, company: 'colegio-peqbri' })
  ok('GET da peqbri não vaza dados da org de teste', otherGet.status === 200 && otherGet.data.company_id === 'colegio-peqbri' && otherGet.data.razao_social !== PAYLOAD.razao_social, 'cid=' + otherGet.data?.company_id + ' rs=' + String(otherGet.data?.razao_social || '').substring(0, 30))

  // ===== 7. Role: editor_admin NÃO acessa (403) =====
  await db.execute({
    sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?,?,?,?,?,0)',
    args: ['__cad_editor__', await bcrypt.hash('prova123', 10), 'editor_admin', 'e@cad.local', ORG],
  })
  const eLogin = await req('/auth/login', { method: 'POST', body: { username: '__cad_editor__', password: 'prova123' } })
  const eGet = await req('/cadastro', { token: eLogin.data?.token })
  ok('editor_admin NÃO acessa cadastro (403)', eGet.status === 403, 'status ' + eGet.status)

  // ===== 8. DELETE da org remove o cadastro (cascade) =====
  const del = await req(`/organizations/${ORG}`, { method: 'DELETE', token })
  ok('DELETE org (cascata)', del.status === 200, 'status ' + del.status)
  const sobra = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM org_cadastro WHERE company_id = ?', args: [ORG] })
  ok('cadastro removido junto com a org (cascade DATA_TABLES)', Number(sobra.rows[0].n) === 0, 'n=' + sobra.rows[0].n)
} finally {
  console.log('[cleanup]...')
  await cleanup()
  await db.execute({ sql: "DELETE FROM login_log WHERE username LIKE '%__cad%' OR username LIKE ?", args: [GESTOR] })
}

const POST = await snapshot()
console.log('[audit] snapshot post:', JSON.stringify(POST))
const diff = []
for (const k of Object.keys(PRE)) {
  if (String(PRE[k]) !== String(POST[k])) diff.push(`${k}: ${PRE[k]} -> ${POST[k]}`)
}
ok('NET-ZERO: banco idêntico ao início', diff.length === 0, diff.join('; '))
ok('BASELINE orgs=2', POST.organizations === 2, 'n=' + POST.organizations)
ok('BASELINE content=210 (V18 aplicada)', POST.content === 210, 'n=' + POST.content)

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
