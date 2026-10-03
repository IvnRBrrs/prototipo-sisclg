import { Router } from 'express'
import { rowsToObjects } from '../rows.js'
import { resolveSiteCompany } from '../siteSource.js'

const router = Router()

router.get('/initial', async (req, res) => {
  try {
    const { effective, base } = await resolveSiteCompany(req)
    const [contentResult, pagesResult, homeContentResult] = await Promise.all([
      req.db.execute({ sql: 'SELECT * FROM content WHERE company_id = ?', args: [effective] }),
      req.db.execute({ sql: 'SELECT * FROM pages WHERE company_id = ? ORDER BY menu_order', args: [effective] }),
      req.db.execute({ sql: 'SELECT * FROM page_content WHERE page_slug = ? AND company_id = ?', args: ['home', effective] }),
    ])

    const content = {}
    contentResult.rows.forEach((r) => { content[r.key] = r.value })

    const homeContent = {}
    homeContentResult.rows.forEach((r) => { homeContent[r.key] = r.value })

    // Fallback por-chave para o template da 'default' — somente site público.
    if (base && base !== effective) {
      const [baseContent, basePages, baseHome] = await Promise.all([
        req.db.execute({ sql: 'SELECT * FROM content WHERE company_id = ?', args: [base] }),
        req.db.execute({ sql: 'SELECT * FROM pages WHERE company_id = ? ORDER BY menu_order', args: [base] }),
        req.db.execute({ sql: 'SELECT * FROM page_content WHERE page_slug = ? AND company_id = ?', args: ['home', base] }),
      ])
      baseContent.rows.forEach((r) => { if (content[r.key] === undefined) content[r.key] = r.value })
      baseHome.rows.forEach((r) => { if (homeContent[r.key] === undefined) homeContent[r.key] = r.value })
      const slugs = new Set(pagesResult.rows.map((r) => String(r.slug)))
      for (const r of basePages.rows) {
        if (!slugs.has(String(r.slug))) pagesResult.rows.push(r)
      }
      pagesResult.rows.sort((a, b) => (Number(a.menu_order) || 0) - (Number(b.menu_order) || 0))
    }

    res.json({
      content,
      pages: rowsToObjects(pagesResult.rows, pagesResult.columns),
      homeContent,
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Tema/configurações públicas da escola resolvida pelo domínio (white-label)
router.get('/theme', async (req, res) => {
  try {
    const org = req.company || { id: 'default', nome: 'Colégio São Judas Tadeu', slug: 'colegio-sao-judas-tadeu', settings: {} }
    res.json({
      id: org.id,
      nome: org.nome,
      slug: org.slug,
      settings: org.settings || {},
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
