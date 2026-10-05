// Gestão de organizações (escolas) — multi-tenant. Apenas super_admin.
//  - CRUD de organizações (id/slug, domínios próprios, settings de tema)
//  - Onboarding: copia o template da organização 'default' (pages,
//    page_content, content) e cria o usuário admin da escola (Turso + Supabase)
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import supabaseAdmin from '../supabaseAdmin.js'
import { invalidateTenantCache } from '../middleware/tenant.js'
import { DUMMY_TEMPLATE } from '../dummySiteTemplate.js'

const router = Router()

const DATA_TABLES = [
  'content', 'pages', 'page_content', 'users', 'images', 'content_backups',
  'historico_alunos', 'alunos', 'aluno_anexos', 'blog_posts', 'contact_messages',
  'pre_enrollments', 'login_log', 'turmas', 'professores', 'disciplinas',
  'turma_disciplinas', 'aluno_turmas', 'matriculas', 'notas', 'frequencia',
  'ocorrencias', 'anos_letivos', 'mensalidades', 'conselho_classe', 'horario_aulas',
  'org_cadastro', 'aulas', 'avaliacoes', 'avaliacao_notas',
]

function parseJSON(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch { return fallback }
}

function serializeOrgs(rows, columns) {
  return rowsToObjects(rows, columns).map((o) => ({
    ...o,
    domains: parseJSON(o.domains, []),
    settings: parseJSON(o.settings, {}),
  }))
}

// Insert multi-linha em chunks: poucos round-trips ao Turso (o batch nativo do
// client serverless não vincula args nesta versão) mantendo parâmetros
// seguramente vinculados. Chunk de 150 rows × N colunas fica sob o limite de
// 999 variáveis por statement do SQLite.
async function insertChunked(db, table, columns, rows, chunkSize = 150) {
  let count = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')
    const args = []
    for (const r of chunk) for (const c of columns) args.push(r[c])
    await db.execute({ sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`, args })
    count += chunk.length
  }
  return count
}

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN))

router.get('/', async (req, res) => {
  try {
    const result = await req.db.execute(`
      SELECT o.*, EXISTS(SELECT 1 FROM content c WHERE c.company_id = o.id) AS provisioned
      FROM organizations o ORDER BY o.created_at`)
    res.json(serializeOrgs(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { slug, nome, domains, settings } = req.body
    if (!slug || !nome) return res.status(400).json({ error: 'slug and nome are required' })

    const normSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!normSlug) return res.status(400).json({ error: 'Invalid slug' })
    if (normSlug === 'default') return res.status(400).json({ error: 'Slug "default" is reserved' })

    const existing = await req.db.execute({
      sql: 'SELECT id FROM organizations WHERE id = ? OR slug = ?',
      args: [normSlug, normSlug],
    })
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Organization already exists' })

    const domainList = Array.isArray(domains)
      ? domains.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
      : []
    // Pin de tenant: amarra o deploy de Vercel (TENANT_PINNED_ORG +
    // VITE_TENANT_ORG_ID) a ESTA organização de forma absoluta.
    const tenantPin = crypto.randomUUID().replace(/-/g, '')
    await req.db.execute({
      sql: 'INSERT INTO organizations (id, nome, slug, domains, settings, status, company_id, tenant_pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [normSlug, String(nome).trim(), normSlug, JSON.stringify(domainList), JSON.stringify(settings || {}), 'active', normSlug, tenantPin],
    })
    invalidateTenantCache()
    res.json({ success: true, id: normSlug, tenant_pin: tenantPin })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// "Site principal" (hidden feature): publica o conteúdo de uma organização no
// site principal (o domínio que resolve para 'default'). Switch e botão
// Publicar do painel chamam esta rota. Escopo: SOMENTE dados do site público
// (content/pages/page_content + blog via substituição) — mensagens, usuários e
// demais dados continuam isolados por organização.
router.put('/site-principal', async (req, res) => {
  try {
    const { org_id, ativo } = req.body
    if (ativo !== true && ativo !== false) {
      return res.status(400).json({ error: 'ativo must be true or false' })
    }

    let principal = null
    if (ativo === true && org_id && String(org_id) !== 'default') {
      const exists = await req.db.execute({
        sql: 'SELECT id FROM organizations WHERE id = ?',
        args: [String(org_id)],
      })
      if (exists.rows.length === 0) return res.status(404).json({ error: 'Organization not found' })
      principal = { org_id: String(org_id), ativo: true, atualizado_em: new Date().toISOString() }
    }

    const current = await req.db.execute({
      sql: "SELECT settings FROM organizations WHERE id = 'default'",
    })
    if (current.rows.length === 0) return res.status(404).json({ error: 'Default organization not found' })
    let settings = {}
    try { settings = JSON.parse(current.rows[0].settings || '{}') } catch {}
    if (principal) {
      settings.site_principal = principal
    } else {
      delete settings.site_principal
    }
    await req.db.execute({
      sql: "UPDATE organizations SET settings = ? WHERE id = 'default'",
      args: [JSON.stringify(settings)],
    })
    invalidateTenantCache()
    res.json({ success: true, site_principal: principal })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Regenera o pin de tenant da organização. ATENÇÃO: invalida imediatamente
// o pin antigo — deploys (Vercel) configurados com o pin anterior deixam de
// servir a organização até atualizarem TENANT_PINNED_ORG/VITE_TENANT_ORG_ID.
router.post('/:id/regenerate-pin', async (req, res) => {
  try {
    const orgId = req.params.id
    const exists = await req.db.execute({
      sql: 'SELECT id FROM organizations WHERE id = ?',
      args: [orgId],
    })
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Organization not found' })

    const novoPin = crypto.randomUUID().replace(/-/g, '')
    await req.db.execute({
      sql: 'UPDATE organizations SET tenant_pin = ? WHERE id = ?',
      args: [novoPin, orgId],
    })
    invalidateTenantCache()
    res.json({ success: true, id: orgId, tenant_pin: novoPin })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { nome, domains, settings, status } = req.body
    const sets = []
    const args = []
    if (nome !== undefined) { sets.push('nome = ?'); args.push(String(nome).trim()) }
    if (domains !== undefined) {
      sets.push('domains = ?')
      args.push(JSON.stringify(domains.map((d) => String(d).trim().toLowerCase()).filter(Boolean)))
    }
    if (settings !== undefined) { sets.push('settings = ?'); args.push(JSON.stringify(settings)) }
    if (status !== undefined) { sets.push('status = ?'); args.push(String(status)) }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    args.push(req.params.id)
    await req.db.execute({
      sql: `UPDATE organizations SET ${sets.join(', ')} WHERE id = ?`,
      args,
    })
    invalidateTenantCache()
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Onboarding: popula a nova organização com o template DUMMY
// (_backend/dummySiteTemplate.js — estrutura da default, valores de exemplo,
// NENHUM dado real/sensível importado) e cria o admin da escola
// (gestor_admin no Turso + Supabase best-effort). Tudo ou nada no Turso
// (transação); o Supabase é reportado na resposta.
router.post('/:id/onboarding', async (req, res) => {
  try {
    const orgId = req.params.id
    const { admin_username, admin_password } = req.body

    const orgResult = await req.db.execute({
      sql: 'SELECT * FROM organizations WHERE id = ?',
      args: [orgId],
    })
    if (orgResult.rows.length === 0) return res.status(404).json({ error: 'Organization not found' })
    if (orgId === 'default') return res.status(400).json({ error: 'default already has content' })

    // Senha fraca é rejeitada ANTES de qualquer escrita.
    if (admin_password !== undefined && admin_password !== null && String(admin_password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' })
    }

    // Idempotência: org já provisionada é rejeitada com erro claro (evita
    // duplicar linhas / erro cru de chave primária ao rodar 2x).
    const hasContent = await req.db.execute({
      sql: 'SELECT COUNT(*) AS n FROM content WHERE company_id = ?',
      args: [orgId],
    })
    if (Number(hasContent.rows[0].n) > 0) {
      return res.status(400).json({ error: 'Organization already provisioned' })
    }

    const username = (admin_username || (orgId + '_admin')).trim().toLowerCase()
    const password = admin_password || crypto.randomBytes(6).toString('hex')
    const email = `${username}@${orgId}.com.br`

    // Username do admin: se já existir, só é aceito se for o gestor_admin DA
    // PRÓPRIA organização (re-provisionamento após reset de dados — a conta
    // da escola é preservada, sem nova senha). De outra org → erro.
    const existing = await req.db.execute({
      sql: 'SELECT company_id, role FROM users WHERE username = ?',
      args: [username],
    })
    let adminExisting = false
    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      if (String(row.company_id) !== orgId || String(row.role) !== ROLES.GESTOR_ADMIN) {
        return res.status(400).json({ error: 'Admin username already exists' })
      }
      adminExisting = true
    }

    const hash = await bcrypt.hash(password, 10)
    // Admin da escola nasce como gestor_admin: gerencia usuários e dados da
    // PRÓPRIA escola (inclusive criando os demais usuários), sem poder
    // acessar outras organizações (isso é exclusivo do super_admin).
    const adminRole = ROLES.GESTOR_ADMIN

    // Transação com inserts multi-linha em chunks: dummy template inteiro +
    // gestor_admin em ~10 round-trips (rápido dentro do limite de função da
    // Vercel). Se qualquer statement falha, ROLLBACK desfaz tudo.
    const pagesRows = DUMMY_TEMPLATE.pages.map((p) => ({
      slug: p.slug, title: p.title, show_in_menu: p.show_in_menu,
      parent_slug: p.parent_slug, menu_order: p.menu_order, company_id: orgId,
    }))
    const pageContentRows = DUMMY_TEMPLATE.pageContent.map((pc) => ({
      page_slug: pc.page_slug, key: pc.key, value: pc.value, company_id: orgId,
    }))
    const contentRows = Object.entries(DUMMY_TEMPLATE.content).map(([key, value]) => ({
      key, value, company_id: orgId,
    }))
    const imagesRows = DUMMY_TEMPLATE.images.map((img) => ({
      id: crypto.randomUUID(), filename: img.filename, data: img.data, type: img.type,
      component_type: img.component_type, thumbnail: img.thumbnail, company_id: orgId,
    }))
    const blogRows = DUMMY_TEMPLATE.blogPosts.map((post) => ({
      id: crypto.randomUUID(), title: post.title, subtitle: post.subtitle, content: post.content,
      author: post.author, date: post.date, tags: post.tags, images: post.images,
      videos: post.videos, slug: post.slug, published: post.published, company_id: orgId,
    }))

    let pagesCopied = 0
    let pageContentCopied = 0
    let contentCopied = 0
    let imagesCopied = 0
    let blogCopied = 0

    await req.db.execute('BEGIN')
    try {
      pagesCopied = await insertChunked(req.db, 'pages', ['slug', 'title', 'show_in_menu', 'parent_slug', 'menu_order', 'company_id'], pagesRows)
      pageContentCopied = await insertChunked(req.db, 'page_content', ['page_slug', 'key', 'value', 'company_id'], pageContentRows)
      contentCopied = await insertChunked(req.db, 'content', ['key', 'value', 'company_id'], contentRows)
      imagesCopied = await insertChunked(req.db, 'images', ['id', 'filename', 'data', 'type', 'component_type', 'thumbnail', 'company_id'], imagesRows)
      blogCopied = await insertChunked(req.db, 'blog_posts', ['id', 'title', 'subtitle', 'content', 'author', 'date', 'tags', 'images', 'videos', 'slug', 'published', 'company_id'], blogRows)
      if (!adminExisting) {
        await req.db.execute({
          sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?, ?, ?, ?, ?, 1)',
          args: [username, hash, adminRole, email, orgId],
        })
      }
      await req.db.execute('COMMIT')
    } catch (e) {
      await req.db.execute('ROLLBACK').catch(() => {})
      console.error('[organizations] onboarding failed:', e.message)
      return res.status(500).json({ error: 'Falha ao provisionar a organização: ' + (e.message || String(e)) })
    }

    // Supabase: best-effort, fora da transação — falha aqui NÃO desfaz o Turso,
    // mas é reportada na resposta para o usuário saber.
    let supabaseOk = false
    let supabaseError = ''
    if (adminExisting) {
      // Re-provisionamento: a conta Supabase da escola já existe — preservada.
      supabaseOk = true
      supabaseError = 'usuário existente preservado'
    } else if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: adminRole, company_id: orgId },
        })
        supabaseOk = true
        console.log('[organizations] Supabase user created for', orgId)
      } catch (e) {
        supabaseError = e.message || 'Unknown error'
        console.error('[organizations] Supabase user creation failed:', e.message)
      }
    } else {
      supabaseError = 'Supabase not configured'
    }

    res.json({
      success: true,
      username,
      password: adminExisting ? null : password,
      admin_existing: adminExisting,
      email,
      role: adminRole,
      supabase: { ok: supabaseOk, error: supabaseError },
      copied: {
        pages: pagesCopied,
        page_content: pageContentCopied,
        content: contentCopied,
        images: imagesCopied,
        blog_posts: blogCopied,
      },
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.params.id
    if (orgId === 'default') return res.status(400).json({ error: 'Cannot delete the default organization' })

    const exists = await req.db.execute({ sql: 'SELECT id FROM organizations WHERE id = ?', args: [orgId] })
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Organization not found' })

    for (const table of DATA_TABLES) {
      try {
        await req.db.execute({ sql: `DELETE FROM ${table} WHERE company_id = ?`, args: [orgId] })
      } catch (e) {
        console.warn(`[organizations] cleanup skip ${table}:`, e.message)
      }
    }
    await req.db.execute({ sql: 'DELETE FROM organizations WHERE id = ?', args: [orgId] })
    invalidateTenantCache()
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
