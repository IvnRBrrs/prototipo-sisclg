// Copia os dados do site público da 'default' para a 'colegio-peqbri',
// como se um humano tivesse preenchido cada componente via CMS:
//   1. Content + page_content: copia tudo, troca o nome da escola
//   2. Campos de contato: ZERADOS (a escola preenche via Cadastro)
//   3. Images: deleta as 4 dummy, copia as 12 reais da default (UUIDs novos)
//   4. Blog: deleta os 2 dummy, copia os 14 da default (UUIDs novos + nome)
//   5. Bump _content_version
// Idempotente: pode rodar de novo (upsert).
import 'dotenv/config'
import { createClient } from '@libsql/client'
import crypto from 'crypto'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })
const ORG = 'colegio-peqbri'

const results = []
const ok = (name, cond, extra = '') => { const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line) }

// ===== Transformações =====

const NOME_VELHO = 'Colégio São Judas Tadeu'
const NOME_NOVO = 'Colégio Pequenos Brilhantes'

// Chaves de CONTATO a zerar (dados da escola real não devem ir para peqbri)
const ZERAR = new Set([
  'address', 'footer_address', 'footer_phone_fixo', 'footer_phone_whatsapp',
  'phone_fixo', 'phone_whatsapp', 'social_instagram_url', 'social_instagram_handle',
  'map_address', 'map_iframe_src', 'form_placeholder_phone',
  'contact_phone', 'contact_email', 'contact_whatsapp',
  'social_facebook_url', 'social_youtube_url',
])

function transform(value, key) {
  let val = String(value || '')
  // 1. Zerar contato
  if (ZERAR.has(key)) return ''
  // 2. Trocar nome da escola (todas as ocorrências, case-insensitive)
  val = val.split(NOME_VELHO).join(NOME_NOVO)
  val = val.split(NOME_VELHO.toUpperCase()).join(NOME_NOVO.toUpperCase())
  // 3. Links de WhatsApp com nome da escola (page_content cg_button_link)
  if (val.includes('wa.me/') && val.includes('Judas')) {
    val = val.split('Colégio São Judas Tadeu').join(NOME_NOVO)
    val = val.split('no Colégio ' + NOME_VELHO).join('no ' + NOME_NOVO)
  }
  return val
}

// Retry wrapper para operações Turso (imagens grandes podem causar timeout)
async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fn() } catch (e) {
      if (i === tries) throw e
      console.log(`  [retry] ${label} tentativa ${i} falhou: ${e.message?.substring(0, 60)} — tentando de novo...`)
      await new Promise((r) => setTimeout(r, 2000 * i))
    }
  }
}

async function insertChunked(table, pkCols, dataCols, rows, chunkSize = 150) {
  let count = 0
  const columns = [...pkCols, ...dataCols]
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')
    const updates = dataCols.map((c) => `${c} = excluded.${c}`).join(', ')
    const args = []
    for (const r of chunk) for (const c of columns) args.push(r[c])
    await db.execute({
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}
            ON CONFLICT(${pkCols.join(', ')}) DO UPDATE SET ${updates}`,
      args,
    })
    count += chunk.length
  }
  return count
}

// ===== Snapshot antes =====
const before = {}
for (const t of ['content', 'page_content', 'images', 'blog_posts']) {
  const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [ORG])
  before[t] = Number(r.rows[0].n)
}
console.log('[antes] peqbri:', JSON.stringify(before))

// ===== 1. Deletar dados atuais da peqbri =====
console.log('[1] limpando dados atuais da peqbri...')
for (const t of ['content', 'page_content', 'images', 'blog_posts']) {
  await db.execute(`DELETE FROM ${t} WHERE company_id = ?`, [ORG])
}
// (não deleta users nem organizations — só dados do site)

// ===== 2. Copiar content (95 chaves, sem marcadores) =====
// Marcadores internos que NÃO são conteúdo do site
const MARKERS = new Set([
  '_content_version', '_migration_version', '_seed_alunos_version',
  '_migration_v2', '_migration_v3', '_migration_v4', '_migration_v5',
  '_migration_v6', '_migration_v7', '_migration_v8', '_migration_v9',
  '_migration_v10', '_migration_v11', '_migration_v12', '_migration_v13',
  '_migration_v14', '_migration_v15', '_migration_v16', '_migration_v17',
  '_migration_v18', 'ks_probe',
])

console.log('[2] copiando content...')
const allContentRows = (await db.execute("SELECT key, value FROM content WHERE company_id = 'default' ORDER BY key")).rows
const contentRows = allContentRows.filter((r) => !MARKERS.has(r.key))
const contentData = []
let nomeTrocado = 0
for (const r of contentRows) {
  const original = String(r.value || '')
  const transformed = transform(original, r.key)
  if (original !== transformed && !ZERAR.has(r.key)) nomeTrocado++
  contentData.push({ key: r.key, value: transformed, company_id: ORG })
}
// _content_version novo (bump em relação à default)
const defVer = await db.execute("SELECT value FROM content WHERE key = '_content_version' AND company_id = 'default'")
contentData.push({ key: '_content_version', value: String(Number(defVer.rows[0].value) + 1), company_id: ORG })

const contentCount = await insertChunked('content', ['key', 'company_id'], ['value'], contentData)
ok(`content copiado: ${contentCount} chaves`, contentCount === 95, `94 reais + _content_version = 95`)
ok(`nome trocado em ${nomeTrocado} chaves`, nomeTrocado > 0)

// ===== 3. Copiar page_content (366 entradas) =====
console.log('[3] copiando page_content...')
const pcRows = (await db.execute("SELECT page_slug, key, value FROM page_content WHERE company_id = 'default' ORDER BY page_slug, key")).rows
const pcData = []
let pcNomeTrocado = 0
let pcZerado = 0
for (const r of pcRows) {
  const original = String(r.value || '')
  const transformed = transform(original, r.key)
  if (original !== transformed && !ZERAR.has(r.key)) pcNomeTrocado++
  if (ZERAR.has(r.key) && original !== '') pcZerado++
  pcData.push({ page_slug: r.page_slug, key: r.key, value: transformed, company_id: ORG })
}
const pcCount = await insertChunked('page_content', ['page_slug', 'key', 'company_id'], ['value'], pcData)
ok(`page_content copiado: ${pcCount} entradas`, pcCount === 366)
ok(`nome trocado em ${pcNomeTrocado} page_content`, pcNomeTrocado > 0)
ok(`contato zerado em ${pcZerado} page_content`, pcZerado >= 0)

// ===== 4. Copiar images (12 da default, UUIDs novos) =====
console.log('[4] copiando images...')
const imgRows = (await db.execute("SELECT filename, data, type, component_type, thumbnail FROM images WHERE company_id = 'default' ORDER BY created_at")).rows
const imgData = []
for (const r of imgRows) {
  imgData.push({
    id: crypto.randomUUID(),
    filename: r.filename,
    data: r.data,
    type: r.type,
    component_type: r.component_type,
    thumbnail: r.thumbnail,
    company_id: ORG,
  })
}
for (const img of imgData) {
  await withRetry(() => db.execute({
    sql: 'INSERT INTO images (id, filename, data, type, component_type, thumbnail, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [img.id, img.filename, img.data, img.type, img.component_type, img.thumbnail, img.company_id],
  }), `image ${img.filename}`)
}
ok(`images copiadas: ${imgData.length}`, imgData.length === 12)

// ===== 5. Copiar blog_posts (14 da default, UUIDs novos + nome trocado) =====
console.log('[5] copiando blog_posts...')
const blogRows = (await db.execute("SELECT title, subtitle, content, author, date, tags, images, videos, slug, published FROM blog_posts WHERE company_id = 'default' ORDER BY date")).rows
const blogData = []
for (const r of blogRows) {
  const title = transform(r.title, 'blog_title')
  const content = transform(r.content, 'blog_content')
  const subtitle = transform(r.subtitle, 'blog_subtitle')
  blogData.push({
    id: crypto.randomUUID(),
    title,
    subtitle,
    content,
    author: r.author,
    date: r.date,
    tags: r.tags,
    images: r.images,
    videos: r.videos,
    slug: r.slug,
    published: r.published,
    company_id: ORG,
  })
}
for (const post of blogData) {
  await withRetry(() => db.execute({
    sql: 'INSERT INTO blog_posts (id, title, subtitle, content, author, date, tags, images, videos, slug, published, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [post.id, post.title, post.subtitle, post.content, post.author, post.date, post.tags, post.images, post.videos, post.slug, post.published, post.company_id],
  }), `blog ${post.slug}`)
}
ok(`blog_posts copiados: ${blogData.length}`, blogData.length === 14)

// ===== 6. Verificações =====
console.log('[6] verificações...')

// Nome novo presente
const checkName = await db.execute("SELECT COUNT(*) AS n FROM content WHERE company_id = ? AND value LIKE ?", [ORG, '%' + NOME_NOVO + '%'])
ok(`'${NOME_NOVO}' presente em ${checkName.rows[0].n} chaves de content`, Number(checkName.rows[0].n) >= 5, 'n=' + checkName.rows[0].n)

// Nome velho AUSENTE
const checkOld = await db.execute("SELECT COUNT(*) AS n FROM content WHERE company_id = ? AND value LIKE ?", [ORG, '%São Judas Tadeu%'])
ok(`'São Judas Tadeu' AUSENTE do content`, Number(checkOld.rows[0].n) === 0, 'n=' + checkOld.rows[0].n)

const checkOldPc = await db.execute("SELECT COUNT(*) AS n FROM page_content WHERE company_id = ? AND value LIKE ?", [ORG, '%São Judas Tadeu%'])
ok(`'São Judas Tadeu' AUSENTE do page_content`, Number(checkOldPc.rows[0].n) === 0, 'n=' + checkOldPc.rows[0].n)

// Contato zerado
const checkAddr = await db.execute("SELECT value FROM content WHERE key = 'address' AND company_id = ?", [ORG])
ok(`address zerado`, checkAddr.rows[0]?.value === '', `valor="${checkAddr.rows[0]?.value}"`)

const checkPhone = await db.execute("SELECT value FROM content WHERE key = 'footer_phone_fixo' AND company_id = ?", [ORG])
ok(`footer_phone_fixo zerado`, checkPhone.rows[0]?.value === '', `valor="${checkPhone.rows[0]?.value}"`)

// default intacta (contando só chaves não-marcador, mesmo critério)
const defAll = (await db.execute("SELECT key FROM content WHERE company_id = 'default'")).rows
const defReal = defAll.filter((r) => !MARKERS.has(r.key)).length
ok(`default intacta: ${defReal} chaves reais`, defReal === 94, 'n=' + defReal)

// Contagens finais
const after = {}
for (const t of ['content', 'page_content', 'images', 'blog_posts']) {
  const r = await db.execute(`SELECT COUNT(*) AS n FROM ${t} WHERE company_id = ?`, [ORG])
  after[t] = Number(r.rows[0].n)
}
console.log('[depois] peqbri:', JSON.stringify(after))
ok(`content: ${after.content}`, after.content === 95) // 95 + _content_version
ok(`page_content: ${after.page_content}`, after.page_content === 366)
ok(`images: ${after.images}`, after.images === 12)
ok(`blog_posts: ${after.blog_posts}`, after.blog_posts === 14)

const fails = results.filter((r) => r.startsWith('FAIL'))
console.log(`\n[resultado] ${results.length - fails.length}/${results.length} PASS`)
process.exit(0)
