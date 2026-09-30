import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.get('/', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'SELECT * FROM contact_messages ORDER BY created_at DESC'
        : 'SELECT * FROM contact_messages WHERE company_id = ? ORDER BY created_at DESC',
      args: isSuper ? [] : [company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' })
    }

    await req.db.execute({
      sql: 'INSERT INTO contact_messages (name, email, phone, message, company_id) VALUES (?, ?, ?, ?, ?)',
      args: [name, email, phone || null, message, req.company_id || 'default'],
    })

    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id/read', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'UPDATE contact_messages SET read = 1 WHERE id = ?'
        : 'UPDATE contact_messages SET read = 1 WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id/archive', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'UPDATE contact_messages SET archived = 1 WHERE id = ?'
        : 'UPDATE contact_messages SET archived = 1 WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM contact_messages WHERE id = ?'
        : 'DELETE FROM contact_messages WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
