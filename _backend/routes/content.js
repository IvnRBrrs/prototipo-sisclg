import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { resolveSiteCompany } from '../siteSource.js'

const router = Router()

const _pending = new Map()

router.get('/', async (req, res) => {
  const { effective, base } = await resolveSiteCompany(req)
  const cacheKey = 'content_all_' + effective + (base ? '_over_' + base : '')
  if (_pending.has(cacheKey)) {
    const data = await _pending.get(cacheKey)
    return res.json(data)
  }
  const promise = (async () => {
    const result = await req.db.execute({
      sql: 'SELECT * FROM content WHERE company_id = ? ORDER BY key',
      args: [effective],
    })
    const data = {}
    result.rows.forEach((row) => {
      data[row.key] = row.value
    })
    // Fallback por-chave: componentes sem valor na organização usam o
    // template da 'default' (somente leitura do site público).
    if (base && base !== effective) {
      const baseResult = await req.db.execute({
        sql: 'SELECT * FROM content WHERE company_id = ? ORDER BY key',
        args: [base],
      })
      baseResult.rows.forEach((row) => {
        if (data[row.key] === undefined) data[row.key] = row.value
      })
    }
    return data
  })()
  _pending.set(cacheKey, promise)
  try {
    const data = await promise
    res.json(data)
  } finally {
    _pending.delete(cacheKey)
  }
})

router.put('/', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  try {
    const { key, value } = req.body
    if (!key) return res.status(400).json({ error: 'Key is required' })

    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: `INSERT INTO content (key, value, updated_at, company_id) VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(key, company_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, value, company_id],
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

router.put('/bulk', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  try {
    const { entries } = req.body
    if (!entries) return res.status(400).json({ error: 'Entries required' })

    const company_id_bulk = req.user.company_id || 'default'
    const statements = Object.entries(entries).map(([key, value]) => ({
      sql: `INSERT INTO content (key, value, updated_at, company_id) VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(key, company_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, value, company_id_bulk],
    }))
    if (statements.length > 0) {
      for (const stmt of statements) await req.db.execute(stmt)
      await req.db.execute({
        sql: `UPDATE content SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = '_content_version' AND company_id = ?`,
        args: [company_id_bulk],
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:key', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN), async (req, res) => {
  try {
    const company_id_del = req.user.company_id || 'default'
    await req.db.execute({
      sql: 'DELETE FROM content WHERE key = ? AND company_id = ?',
      args: [req.params.key, company_id_del],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
