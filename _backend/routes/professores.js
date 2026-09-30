import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR))

const FIELDS = ['nome', 'email', 'telefone', 'cpf', 'especialidade', 'status']

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = 'SELECT * FROM professores'
    const args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('company_id = ?')
      args.push(company_id)
    }
    const search = (req.query.search || '').trim()
    if (search) {
      conditions.push('(nome LIKE ? OR email LIKE ? OR cpf LIKE ?)')
      const p = `%${search}%`
      args.push(p, p, p)
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY nome'
    const result = await req.db.execute({ sql, args })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'SELECT * FROM professores WHERE id = ?'
        : 'SELECT * FROM professores WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Professor not found' })
    res.json(rowsToObjects(result.rows, result.columns)[0])
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body.nome) return res.status(400).json({ error: 'nome required' })
    const id = crypto.randomUUID()
    const sets = ['id', 'company_id']
    const vals = [id, req.user.company_id || 'default']
    const placeholders = ['?', '?']
    for (const field of FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        sets.push(field)
        vals.push(req.body[field])
        placeholders.push('?')
      }
    }
    await req.db.execute({
      sql: `INSERT INTO professores (${sets.join(', ')}) VALUES (${placeholders.join(', ')})`,
      args: vals,
    })
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
        ? `UPDATE professores SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE professores SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Professor not found' })
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
    await req.db.execute({
      sql: isSuper
        ? 'UPDATE turma_disciplinas SET professor_id = ? WHERE professor_id = ?'
        : 'UPDATE turma_disciplinas SET professor_id = ? WHERE professor_id = ? AND company_id = ?',
      args: isSuper ? ['', req.params.id] : ['', req.params.id, company_id],
    })
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM professores WHERE id = ?'
        : 'DELETE FROM professores WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Professor not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
