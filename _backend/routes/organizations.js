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

const router = Router()

const DATA_TABLES = [
  'content', 'pages', 'page_content', 'users', 'images', 'content_backups',
  'historico_alunos', 'alunos', 'aluno_anexos', 'blog_posts', 'contact_messages',
  'pre_enrollments', 'login_log', 'turmas', 'professores', 'disciplinas',
  'turma_disciplinas', 'aluno_turmas', 'matriculas', 'notas', 'frequencia',
  'ocorrencias', 'anos_letivos', 'mensalidades', 'conselho_classe', 'horario_aulas',
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
    await req.db.execute({
      sql: 'INSERT INTO organizations (id, nome, slug, domains, settings, status) VALUES (?, ?, ?, ?, ?, ?)',
      args: [normSlug, String(nome).trim(), normSlug, JSON.stringify(domainList), JSON.stringify(settings || {}), 'active'],
    })
    invalidateTenantCache()
    res.json({ success: true, id: normSlug })
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

// Onboarding: copia o template da 'default' (páginas, conteúdo, imagens e
// posts do blog — todos com ids novos, pois id é chave global) para a nova
// escola e cria o admin (Turso + Supabase). Tudo ou nada no Turso (transação);
// o Supabase é best-effort e reportado na resposta.
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

    await req.db.execute('BEGIN')
    try {
      const existing = await req.db.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: [username],
      })
      if (existing.rows.length > 0) {
        await req.db.execute('ROLLBACK')
        return res.status(400).json({ error: 'Admin username already exists' })
      }

      const pagesRes = await req.db.execute({
        sql: `INSERT INTO pages (slug, title, show_in_menu, parent_slug, menu_order, created_at, company_id)
              SELECT slug, title, show_in_menu, parent_slug, menu_order, created_at, ? FROM pages WHERE company_id = 'default'`,
        args: [orgId],
      })
      const pageContentRes = await req.db.execute({
        sql: `INSERT INTO page_content (page_slug, key, value, company_id)
              SELECT page_slug, key, value, ? FROM page_content WHERE company_id = 'default'`,
        args: [orgId],
      })
      const contentRes = await req.db.execute({
        sql: `INSERT INTO content (key, value, updated_at, company_id)
              SELECT key, value, updated_at, ? FROM content WHERE company_id = 'default'`,
        args: [orgId],
      })

      // Imagens: ids NOVOS (a PK de images é o id, global). O conteúdo do site
      // embute as imagens como base64 nos valores, então nada é referenciado
      // por id — a biblioteca do CMS da nova escola fica independente.
      const srcImages = await req.db.execute({
        sql: 'SELECT filename, data, type, component_type, thumbnail, created_at FROM images WHERE company_id = ?',
        args: ['default'],
      })
      let imagesCopied = 0
      for (const row of srcImages.rows) {
        await req.db.execute({
          sql: 'INSERT INTO images (id, filename, data, type, component_type, thumbnail, created_at, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), row.filename, row.data, row.type, row.component_type, row.thumbnail, row.created_at, orgId],
        })
        imagesCopied++
      }

      // Posts do blog: ids NOVOS (mesmo motivo). As imagens do post são
      // objetos {url} auto-contidos (base64), sem vínculo por id.
      const srcBlog = await req.db.execute({
        sql: 'SELECT title, subtitle, content, author, date, tags, images, videos, slug, published, created_at FROM blog_posts WHERE company_id = ?',
        args: ['default'],
      })
      let blogCopied = 0
      for (const row of srcBlog.rows) {
        await req.db.execute({
          sql: 'INSERT INTO blog_posts (id, title, subtitle, content, author, date, tags, images, videos, slug, published, created_at, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), row.title, row.subtitle, row.content, row.author, row.date, row.tags, row.images, row.videos, row.slug, row.published, row.created_at, orgId],
        })
        blogCopied++
      }

      const hash = await bcrypt.hash(password, 10)
      await req.db.execute({
        sql: 'INSERT INTO users (username, password_hash, role, email, company_id, must_change_password) VALUES (?, ?, ?, ?, ?, 1)',
        args: [username, hash, ROLES.EDITOR_ADMIN, email, orgId],
      })

      await req.db.execute('COMMIT')

      // Supabase: best-effort, fora da transação — falha aqui NÃO desfaz o
      // Turso, mas é reportada na resposta para o usuário saber.
      let supabaseOk = false
      let supabaseError = ''
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: ROLES.EDITOR_ADMIN, company_id: orgId },
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
        password,
        email,
        supabase: { ok: supabaseOk, error: supabaseError },
        copied: {
          pages: pagesRes.rowsAffected,
          page_content: pageContentRes.rowsAffected,
          content: contentRes.rowsAffected,
          images: imagesCopied,
          blog_posts: blogCopied,
        },
      })
    } catch (err) {
      await req.db.execute('ROLLBACK').catch(() => {})
      console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
      res.status(500).json({ error: String(err) })
    }
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
