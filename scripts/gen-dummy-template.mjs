// Gera _backend/dummySiteTemplate.js a partir da ESTRUTURA real da default,
// com valores DUMMY (nenhum dado sensível). Script TEMPORÁRIO.
import 'dotenv/config'
import { createClient } from '@libsql/client'
import { writeFileSync } from 'fs'

const db = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN })

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#cccccc"/><text x="400" y="205" font-family="Arial" font-size="30" fill="#888888" text-anchor="middle">Imagem de Exemplo</text></svg>'
const PLACEHOLDER_IMG = 'data:image/svg+xml;base64,' + Buffer.from(SVG).toString('base64')
const SVG_B64 = Buffer.from(SVG).toString('base64')

const KEEP_EXACT = new Set(['_sections', '_nav_items']) // estruturais (registry/menu)
const ASSET_RE = /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i

function isHexColor(v) { return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) }
function isNumberLike(v) { return /^-?\d+(\.\d+)?$/.test(v) }

function dummyString(key, value) {
  const k = String(key).toLowerCase()
  if (k.includes('email')) return 'exemplo@escola.com.br'
  if (k.includes('telefone') || k.includes('phone') || k.includes('whatsapp')) return '(00) 00000-0000'
  if (k.includes('endereco') || k.includes('address')) return 'Rua Exemplo, 123 — Sua Cidade/UF'
  if (k.includes('cnpj')) return '00.000.000/0000-00'
  if (k.includes('instagram') || k.includes('facebook') || k.includes('youtube') || k.includes('twitter')) return '#'
  if (k.includes('titulo') || k.includes('title')) return 'Título de Exemplo'
  if (k.includes('nome') || k.includes('name') || k.includes('autor') || k.includes('author') || k.includes('diretor') || k.includes('responsavel')) return 'Nome de Exemplo'
  return 'Exemplo de conteúdo.'
}

// Para strings DENTRO de estruturas JSON e valores simples: preserva o que é
// estrutural/config (cores, números, booleanos, âncoras/rotas internas, vazios,
// @handles); assets de imagem internos → placeholder; externos → '#'.
function dummyStringIn(key, v) {
  if (v === '') return v
  if (isHexColor(v)) return v
  if (isNumberLike(v)) return v
  if (v === 'true' || v === 'false') return v
  if (v.startsWith('data:image')) return PLACEHOLDER_IMG
  if (v.startsWith('http')) return '#'
  if (v.startsWith('/')) return ASSET_RE.test(v) ? PLACEHOLDER_IMG : v
  if (v.startsWith('#')) return v
  if (v.startsWith('@')) return '@exemplo'
  return dummyString(key, v)
}

function dummyJson(node) {
  if (Array.isArray(node)) {
    if (node.length === 0) return []
    return [dummyJson(node[0])]
  }
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(node)) {
      if (k === '_id' || k === 'instanceId' || k === 'id') { out[k] = val; continue }
      if (typeof val === 'string') {
        out[k] = dummyStringIn(k, val)
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        out[k] = val
      } else if (val && typeof val === 'object') {
        out[k] = dummyJson(val)
      } else {
        out[k] = val
      }
    }
    return out
  }
  return node
}

function dummyValue(key, value) {
  if (KEEP_EXACT.has(key)) return String(value)
  if (String(key).toLowerCase().startsWith('color_')) return String(value) // paleta de tema não é sensível
  const v = String(value ?? '')
  if (v === '') return v
  if (v.startsWith('data:image')) return PLACEHOLDER_IMG
  if (v.startsWith('http')) return '#'
  if (v.startsWith('/')) return ASSET_RE.test(v) ? PLACEHOLDER_IMG : v
  if (v.startsWith('#')) return v
  if (isHexColor(v) || isNumberLike(v) || v === 'true' || v === 'false') return v
  const t = v.trim()
  if (t.startsWith('[') || t.startsWith('{')) {
    try { return JSON.stringify(dummyJson(JSON.parse(t))) } catch { return 'Exemplo de conteúdo.' }
  }
  return dummyString(key, v)
}

// ===== content =====
const contentRows = (await db.execute("SELECT key, value FROM content WHERE company_id = 'default' ORDER BY key")).rows
const content = {}
let skippedMarkers = 0
for (const r of contentRows) {
  if (r.key.startsWith('_migration') || r.key.startsWith('_seed_')) { skippedMarkers++; continue }
  if (r.key === '_content_version') { content[r.key] = '1'; continue }
  if (KEEP_EXACT.has(r.key)) { content[r.key] = r.value; continue }
  content[r.key] = dummyValue(r.key, r.value)
}

// ===== pages (estrutura estrutural: slug/menu) =====
const pagesRows = (await db.execute("SELECT slug, title, show_in_menu, parent_slug, menu_order FROM pages WHERE company_id = 'default' ORDER BY menu_order")).rows
const pages = pagesRows.map((r) => ({
  slug: r.slug,
  title: /judas|sjt|são judas/i.test(String(r.title)) ? 'Página de Exemplo' : r.title,
  show_in_menu: Number(r.show_in_menu),
  parent_slug: r.parent_slug,
  menu_order: Number(r.menu_order),
}))

// ===== page_content =====
const pcRows = (await db.execute("SELECT page_slug, key, value FROM page_content WHERE company_id = 'default' ORDER BY page_slug, key")).rows
const pageContent = pcRows.map((r) => ({ page_slug: r.page_slug, key: r.key, value: dummyValue(r.key, r.value) }))

// ===== imagens dummy =====
const images = [1, 2, 3].map((i) => ({
  filename: `exemplo-${i}.svg`,
  data: SVG_B64,
  type: 'image/svg+xml',
  component_type: 'exemplo',
  thumbnail: SVG_B64,
}))

// ===== posts dummy =====
const today = new Date().toISOString().split('T')[0]
const blogPosts = [
  { title: 'Bem-vindo ao site da sua escola!', subtitle: 'Post de exemplo', content: 'Este é um post de exemplo criado pelo provisionamento. Substitua pelos posts da sua escola.', author: 'Equipe da Escola', date: today, tags: '[]', images: '[]', videos: '[]', slug: 'bem-vindo', published: 1 },
  { title: 'Exemplo de notícia escolar', subtitle: 'Outro post de exemplo', content: 'Use o painel administrativo para editar ou excluir este post de exemplo.', author: 'Equipe da Escola', date: today, tags: '[]', images: '[]', videos: '[]', slug: 'exemplo-de-noticia', published: 1 },
]

const file = `// Template DUMMY de site para provisionamento de novas organizações.
// Gerado a partir da ESTRUTURA (chaves/páginas/seções) da organização 'default',
// com valores genéricos de exemplo — NENHUM dado sensível (endereços, nomes,
// fotos, documentos) da escola original é levado para as novas organizações.
// Alterações visuais devem ser feitas aqui: o onboarding lê somente este arquivo.
export const DUMMY_TEMPLATE = ${JSON.stringify({ content, pages, pageContent, images, blogPosts }, null, 2)}
`
writeFileSync('_backend/dummySiteTemplate.js', file)

// ===== verificação de sensibilidade =====
const SENSITIVE = ['Adolfo', 'Maceió', '18.212', 'São Judas', 'Sao Judas', 'SJT', 'colegiostjm', 'Maria Aparecida', 'colegiosjtm', '435']
const found = SENSITIVE.filter((s) => file.includes(s))
console.log('content keys:', Object.keys(content).length, '| skipped markers:', skippedMarkers)
console.log('pages:', pages.length, '| pageContent:', pageContent.length, '| images:', images.length, '| blogPosts:', blogPosts.length)
console.log('tamanho arquivo:', (Buffer.byteLength(file) / 1024).toFixed(1), 'KB')
console.log('SENSIBILIDADE:', found.length === 0 ? 'OK — nenhum dado sensível encontrado' : 'ATENÇÃO: ' + JSON.stringify(found))
process.exit(0)
