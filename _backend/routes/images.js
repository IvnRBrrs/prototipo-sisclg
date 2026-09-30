import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import crypto from 'crypto'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const includeData = req.query.data !== 'false'
    const columns = includeData ? '*' : 'id, filename, type, component_type, thumbnail, created_at'
    const result = await req.db.execute({
      sql: `SELECT ${columns} FROM images WHERE company_id = ? ORDER BY created_at DESC`,
      args: [req.company_id || 'default'],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id/data', async (req, res) => {
  try {
    const result = await req.db.execute({
      sql: 'SELECT data, type FROM images WHERE id = ? AND company_id = ?',
      args: [req.params.id, req.company_id || 'default'],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' })
    res.json(rowsToObjects(result.rows, result.columns)[0])
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/upload', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const { filename, data, type, component_type, thumbnail } = req.body
    if (!filename || !data || !type) {
      return res.status(400).json({ error: 'filename, data, and type are required' })
    }

    const id = crypto.randomUUID()
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: 'INSERT INTO images (id, filename, data, type, component_type, thumbnail, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, filename, data, type, component_type || null, thumbnail || null, company_id],
    })

    res.json({ id, filename, type })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.patch('/:id/thumbnail', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const { thumbnail } = req.body
    if (!thumbnail) return res.status(400).json({ error: 'thumbnail is required' })

    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'UPDATE images SET thumbnail = ? WHERE id = ?'
        : 'UPDATE images SET thumbnail = ? WHERE id = ? AND company_id = ?',
      args: isSuper ? [thumbnail, req.params.id] : [thumbnail, req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.EDITOR_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM images WHERE id = ?'
        : 'DELETE FROM images WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
