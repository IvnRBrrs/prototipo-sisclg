import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO))

const FIELDS = ['ano', 'inicio', 'fim', 'status']

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = 'SELECT * FROM anos_letivos'
    const args = []
    if (!isSuper) {
      sql += ' WHERE company_id = ?'
      args.push(company_id)
    }
    sql += ' ORDER BY ano DESC'
    const result = await req.db.execute({ sql, args })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body.ano) return res.status(400).json({ error: 'ano required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const dup = await req.db.execute({
      sql: isSuper
        ? 'SELECT 1 FROM anos_letivos WHERE ano = ?'
        : 'SELECT 1 FROM anos_letivos WHERE ano = ? AND company_id = ?',
      args: isSuper ? [String(req.body.ano)] : [String(req.body.ano), company_id],
    })
    if (dup.rows.length > 0) return res.status(400).json({ error: 'Ano letivo já cadastrado' })

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: 'INSERT INTO anos_letivos (id, ano, inicio, fim, status, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, String(req.body.ano), req.body.inicio || '', req.body.fim || '', req.body.status || 'ativo', company_id],
    })
    if (req.body.status === 'ativo') {
      await req.db.execute({
        sql: 'UPDATE anos_letivos SET status = ? WHERE company_id = ? AND id != ?',
        args: ['encerrado', company_id, id],
      })
    }
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const sets = []
    const args = []
    for (const field of FIELDS) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`)
        args.push(req.body[field])
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    args.push(req.params.id)
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? `UPDATE anos_letivos SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE anos_letivos SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Ano letivo not found' })
    if (req.body.status === 'ativo') {
      await req.db.execute({
        sql: 'UPDATE anos_letivos SET status = ? WHERE company_id = ? AND id != ?',
        args: ['encerrado', company_id, req.params.id],
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM anos_letivos WHERE id = ?'
        : 'DELETE FROM anos_letivos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Ano letivo not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
