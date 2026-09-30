import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

const DROPDOWN_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO,
  ROLES.SECRETARIA_ESCOLAR, ROLES.FINANCEIRO, ROLES.PROFESSOR,
]

// Read-only minimal list for dropdowns (professor/financeiro não podem acessar o CRUD completo)
router.get('/select', authMiddleware, requireRole(...DROPDOWN_ROLES), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const isProfessor = req.user.role === ROLES.PROFESSOR
    const company_id = req.user.company_id || 'default'
    let sql, args
    if (isProfessor) {
      // Professor só vê as disciplinas que leciona
      const pid = req.user.professor_id || ''
      if (!pid) return res.json([])
      sql = `SELECT DISTINCT d.id, d.nome, d.abreviatura
             FROM disciplinas d
             JOIN turma_disciplinas td ON td.disciplina_id = d.id
             WHERE td.professor_id = ? AND td.company_id = ?
             ORDER BY d.nome`
      args = [pid, company_id]
    } else {
      sql = `SELECT id, nome, abreviatura FROM disciplinas` + (isSuper ? '' : ' WHERE company_id = ?') + ' ORDER BY nome'
      args = isSuper ? [] : [company_id]
    }
    const result = await req.db.execute({ sql, args })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR))

const FIELDS = ['nome', 'abreviatura', 'carga_horaria']

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = 'SELECT * FROM disciplinas'
    const args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('company_id = ?')
      args.push(company_id)
    }
    const search = (req.query.search || '').trim()
    if (search) {
      conditions.push('nome LIKE ?')
      args.push(`%${search}%`)
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
        ? 'SELECT * FROM disciplinas WHERE id = ?'
        : 'SELECT * FROM disciplinas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Disciplina not found' })
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
      sql: `INSERT INTO disciplinas (${sets.join(', ')}) VALUES (${placeholders.join(', ')})`,
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
        ? `UPDATE disciplinas SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE disciplinas SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Disciplina not found' })
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
        ? 'DELETE FROM turma_disciplinas WHERE disciplina_id = ?'
        : 'DELETE FROM turma_disciplinas WHERE disciplina_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM disciplinas WHERE id = ?'
        : 'DELETE FROM disciplinas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Disciplina not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
