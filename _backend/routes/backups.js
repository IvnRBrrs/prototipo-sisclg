import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.get('/:sectionKey', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: 'SELECT * FROM content_backups WHERE section_key = ? AND company_id = ? ORDER BY version DESC LIMIT 6',
      args: [req.params.sectionKey, company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { section_key, value } = req.body
    if (!section_key || !value) {
      return res.status(400).json({ error: 'section_key and value are required' })
    }

    const company_id = req.user.company_id || 'default'
    const versionResult = await req.db.execute({
      sql: 'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM content_backups WHERE section_key = ? AND company_id = ?',
      args: [section_key, company_id],
    })
    const version = versionResult.rows[0].next_version

    await req.db.execute({
      sql: 'INSERT INTO content_backups (section_key, value, version, company_id) VALUES (?, ?, ?, ?)',
      args: [section_key, value, version, company_id],
    })

    res.json({ success: true, version })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/restore', authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { section_key, version } = req.body
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: 'SELECT * FROM content_backups WHERE section_key = ? AND version = ? AND company_id = ?',
      args: [section_key, version, company_id],
    })

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' })
    }

    const backup = result.rows[0]
    const value = JSON.parse(backup.value)

    const statements = Object.entries(value).map(([key, val]) => ({
      sql: `INSERT INTO content (key, value, updated_at, company_id) VALUES (?, ?, datetime('now'), ?)
            ON CONFLICT(key, company_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      args: [key, String(val), company_id],
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
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
