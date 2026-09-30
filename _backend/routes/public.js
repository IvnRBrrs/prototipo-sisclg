import { Router } from 'express'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.get('/initial', async (req, res) => {
  try {
    const company_id = req.company_id || 'default'
    const [contentResult, pagesResult, homeContentResult] = await Promise.all([
      req.db.execute({ sql: 'SELECT * FROM content WHERE company_id = ?', args: [company_id] }),
      req.db.execute({ sql: 'SELECT * FROM pages WHERE company_id = ? ORDER BY menu_order', args: [company_id] }),
      req.db.execute({ sql: 'SELECT * FROM page_content WHERE page_slug = ? AND company_id = ?', args: ['home', company_id] }),
    ])

    const content = {}
    contentResult.rows.forEach((r) => { content[r.key] = r.value })

    const homeContent = {}
    homeContentResult.rows.forEach((r) => { homeContent[r.key] = r.value })

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
