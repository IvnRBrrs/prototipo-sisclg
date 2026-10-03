import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { resolveSiteCompany } from '../siteSource.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { effective, base } = await resolveSiteCompany(req)
    const result = await req.db.execute({
      sql: `
      SELECT p.*, pc.key as content_key, pc.value as content_value
      FROM pages p
      LEFT JOIN page_content pc ON pc.page_slug = p.slug AND pc.company_id = p.company_id
      WHERE p.company_id = ?
      ORDER BY p.menu_order, p.slug
    `,
      args: [effective],
    })

    const pageMap = {}
    for (const row of result.rows) {
      if (!pageMap[row.slug]) {
        pageMap[row.slug] = {
          slug: row.slug,
          title: row.title,
          show_in_menu: !!row.show_in_menu,
          parent_slug: row.parent_slug,
          menu_order: row.menu_order,
          created_at: row.created_at,
          content: {},
        }
      }
      if (row.content_key) {
        try {
          pageMap[row.slug].content[row.content_key] = JSON.parse(row.content_value)
        } catch {
          pageMap[row.slug].content[row.content_key] = row.content_value
        }
      }
    }

    // Fallback: páginas (e seus conteúdos) que a organização não tiver vêm do
    // template da 'default' — somente para o site público.
    if (base && base !== effective) {
      const baseResult = await req.db.execute({
        sql: `
        SELECT p.*, pc.key as content_key, pc.value as content_value
        FROM pages p
        LEFT JOIN page_content pc ON pc.page_slug = p.slug AND pc.company_id = p.company_id
        WHERE p.company_id = ?
        ORDER BY p.menu_order, p.slug
      `,
        args: [base],
      })
      const baseMap = {}
      for (const row of baseResult.rows) {
        if (!baseMap[row.slug]) {
          baseMap[row.slug] = {
            slug: row.slug,
            title: row.title,
            show_in_menu: !!row.show_in_menu,
            parent_slug: row.parent_slug,
            menu_order: row.menu_order,
            created_at: row.created_at,
            content: {},
          }
        }
        if (row.content_key) {
          try {
            baseMap[row.slug].content[row.content_key] = JSON.parse(row.content_value)
          } catch {
            baseMap[row.slug].content[row.content_key] = row.content_value
          }
        }
      }
      for (const slug of Object.keys(baseMap)) {
        if (!pageMap[slug]) pageMap[slug] = baseMap[slug]
      }
    }

    const pages = Object.values(pageMap).sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
    res.json(pages)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

function normSlug(s) { return (s || '').replace(/^\/+|\/+$/g, '') }

router.get('/:slug', async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const { effective, base } = await resolveSiteCompany(req)
    let result = await req.db.execute({
      sql: 'SELECT * FROM pages WHERE slug = ? AND company_id = ?',
      args: [slug, effective],
    })
    let company = effective
    if (result.rows.length === 0 && base && base !== effective) {
      result = await req.db.execute({
        sql: 'SELECT * FROM pages WHERE slug = ? AND company_id = ?',
        args: [slug, base],
      })
      company = base
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' })
    }

    const page = result.rows[0]
    const contentResult = await req.db.execute({
      sql: 'SELECT key, value FROM page_content WHERE page_slug = ? AND company_id = ?',
      args: [slug, company],
    })

    const content = {}
    for (const row of contentResult.rows) {
      try {
        content[row.key] = JSON.parse(row.value)
      } catch {
        content[row.key] = row.value
      }
    }
    // Fallback por-chave do conteúdo da página para o template da 'default'.
    if (base && base !== effective && company === effective) {
      const baseContent = await req.db.execute({
        sql: 'SELECT key, value FROM page_content WHERE page_slug = ? AND company_id = ?',
        args: [slug, base],
      })
      for (const row of baseContent.rows) {
        if (content[row.key] === undefined) {
          try {
            content[row.key] = JSON.parse(row.value)
          } catch {
            content[row.key] = row.value
          }
        }
      }
    }

    res.json({
      slug: page.slug,
      title: page.title,
      show_in_menu: !!page.show_in_menu,
      parent_slug: page.parent_slug,
      menu_order: page.menu_order,
      created_at: page.created_at,
      content,
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  try {
    let slug = (req.body.slug || '').replace(/^\/+|\/+$/g, '')
    const { title, show_in_menu, parent_slug, menu_order, content } = req.body
    if (!slug || !title) return res.status(400).json({ error: 'slug and title are required' })

    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: `INSERT INTO pages (slug, title, show_in_menu, parent_slug, menu_order, company_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug, company_id) DO UPDATE SET
              title = excluded.title, show_in_menu = excluded.show_in_menu,
              parent_slug = excluded.parent_slug, menu_order = excluded.menu_order`,
      args: [
        slug,
        title,
        show_in_menu !== undefined ? (show_in_menu ? 1 : 0) : 1,
        parent_slug || null,
        menu_order || 0,
        company_id,
      ],
    })

    const statements = []
    if (content) {
      Object.entries(content).forEach(([key, value]) => {
        statements.push({
          sql: `INSERT INTO page_content (page_slug, key, value, company_id) VALUES (?, ?, ?, ?)
                ON CONFLICT(page_slug, key, company_id) DO UPDATE SET value = excluded.value`,
          args: [slug, key, typeof value === 'string' ? value : JSON.stringify(value), company_id],
        })
      })
    }
    statements.push({
      sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
      args: [company_id],
    })
    for (const stmt of statements) await req.db.execute(stmt)
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:slug', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const updates = req.body
    const sets = []
    const args = []
    if (updates.show_in_menu !== undefined) {
      sets.push('show_in_menu = ?')
      args.push(updates.show_in_menu ? 1 : 0)
    }
    if (updates.title !== undefined) {
      sets.push('title = ?')
      args.push(updates.title)
    }
    if (updates.parent_slug !== undefined) {
      sets.push('parent_slug = ?')
      args.push(updates.parent_slug || null)
    }
    if (updates.menu_order !== undefined) {
      sets.push('menu_order = ?')
      args.push(updates.menu_order)
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })
    args.push(slug)
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: `UPDATE pages SET ${sets.join(', ')} WHERE slug = ? AND company_id = ?`,
      args: [...args, company_id],
    })
    await req.db.execute({
      sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
      args: [company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:slug/content', async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const { effective, base } = await resolveSiteCompany(req)
    const pageExists = await req.db.execute({ sql: 'SELECT 1 FROM pages WHERE slug = ? AND company_id = ?', args: [slug, effective] })
    if (pageExists.rows.length === 0 && base && base !== effective) {
      const basePage = await req.db.execute({ sql: 'SELECT 1 FROM pages WHERE slug = ? AND company_id = ?', args: [slug, base] })
      if (basePage.rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' })
      }
    } else if (pageExists.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' })
    }
    const result = await req.db.execute({
      sql: `SELECT key, value FROM content WHERE company_id = ?
            UNION ALL
            SELECT key, value FROM page_content WHERE page_slug = ? AND company_id = ?`,
      args: [effective, slug, effective],
    })
    const content = {}
    for (const row of result.rows) {
      content[row.key] = row.value
    }
    // Fallback por-chave: o que a página da organização não tiver vem do
    // template da 'default' (content global + page_content da página).
    if (base && base !== effective) {
      const baseResult = await req.db.execute({
        sql: `SELECT key, value FROM content WHERE company_id = ?
              UNION ALL
              SELECT key, value FROM page_content WHERE page_slug = ? AND company_id = ?`,
        args: [base, slug, base],
      })
      for (const row of baseResult.rows) {
        if (content[row.key] === undefined) content[row.key] = row.value
      }
    }
    res.json(content)
  } catch (err) {
    console.error('[pages.js] ERROR for slug:', slug, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:slug/content', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const entries = req.body
    const company_id = req.user.company_id || 'default'
    const statements = Object.entries(entries).map(([key, value]) => ({
      sql: `INSERT INTO page_content (page_slug, key, value, company_id) VALUES (?, ?, ?, ?)
            ON CONFLICT(page_slug, key, company_id) DO UPDATE SET value = excluded.value`,
      args: [slug, key, typeof value === 'string' ? value : JSON.stringify(value), company_id],
    }))
    if (statements.length > 0) {
      for (const stmt of statements) await req.db.execute(stmt)
      await req.db.execute({
        sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
        args: [company_id],
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[pages.js] PUT /:slug/content ERROR:', err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:slug/content/bulk', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const { entries } = req.body
    if (!entries) return res.status(400).json({ error: 'Entries required' })
    const company_id = req.user.company_id || 'default'
    const statements = Object.entries(entries).map(([key, value]) => ({
      sql: `INSERT INTO page_content (page_slug, key, value, company_id) VALUES (?, ?, ?, ?)
            ON CONFLICT(page_slug, key, company_id) DO UPDATE SET value = excluded.value`,
      args: [slug, key, typeof value === 'string' ? value : JSON.stringify(value), company_id],
    }))
    if (statements.length > 0) {
      for (const stmt of statements) await req.db.execute(stmt)
      await req.db.execute({
        sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
        args: [company_id],
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[pages.js] PUT /:slug/content/bulk ERROR:', err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:slug', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  const slug = normSlug(req.params.slug)
  try {
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: 'DELETE FROM page_content WHERE page_slug = ? AND company_id = ?',
      args: [slug, company_id],
    })
    const result = await req.db.execute({
      sql: 'DELETE FROM pages WHERE slug = ? AND company_id = ?',
      args: [slug, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Page not found' })
    await req.db.execute({
      sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
      args: [company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[pages.js] DELETE /:slug ERROR:', err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
