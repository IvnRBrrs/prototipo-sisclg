import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

const DROPDOWN_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO,
  ROLES.SECRETARIA_ESCOLAR, ROLES.FINANCEIRO, ROLES.PROFESSOR,
]

// Read-only minimal list (id, nome) for dropdowns — professor/financeiro não podem
// acessar o cadastro completo de alunos (CPF, endereço, responsáveis, etc.)
router.get('/select', authMiddleware, requireRole(...DROPDOWN_ROLES), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const isProfessor = req.user.role === ROLES.PROFESSOR
    const company_id = req.user.company_id || 'default'
    let sql, args
    if (isProfessor) {
      // Professor só vê os alunos das turmas em que é responsável ou onde leciona
      const pid = req.user.professor_id || ''
      if (!pid) return res.json([])
      sql = `SELECT DISTINCT a.id, a.nome
             FROM alunos a
             JOIN aluno_turmas at ON at.aluno_id = a.id
             JOIN turmas t ON t.id = at.turma_id
             WHERE a.company_id = ?
               AND (t.professor_responsavel_id = ? OR t.id IN (SELECT turma_id FROM turma_disciplinas WHERE professor_id = ? AND company_id = ?))
             ORDER BY a.nome`
      args = [company_id, pid, pid, company_id]
    } else {
      sql = `SELECT id, nome FROM alunos` + (isSuper ? '' : ' WHERE company_id = ?') + ' ORDER BY nome'
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

const INSERT_FIELDS = [
  'nome', 'sexo', 'escolaridade', 'turma', 'data_nascimento',
  'cpf', 'telefone', 'nome_pai', 'nome_mae', 'telefone_pais',
  'responsavel_financeiro', 'cpf_responsavel', 'endereco', 'telefone_contato',
  'ano_letivo_atual', 'turma_atual',
  'naturalidade', 'disciplinas', 'periodo', 'carga_horaria',
]

router.get('/', async (req, res) => {
  try {
    const search = (req.query.search || '').trim()
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = 'SELECT * FROM alunos'
    let args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('company_id = ?')
      args.push(company_id)
    }
    if (search) {
      conditions.push("(nome LIKE ? OR cpf LIKE ? OR strftime('%Y', created_at) LIKE ?)")
      const p = `%${search}%`
      args.push(p, p, p)
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY created_at DESC'
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
    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT * FROM alunos WHERE id = ?'
        : 'SELECT * FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    const anexos = await req.db.execute({
      sql: 'SELECT id, aluno_id, categoria, filename, type, created_at FROM aluno_anexos WHERE aluno_id = ?',
      args: [req.params.id],
    })

    res.json({
      aluno: rowsToObjects(aluno.rows, aluno.columns)[0],
      anexos: rowsToObjects(anexos.rows, anexos.columns),
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const id = crypto.randomUUID()
    const sets = ['id']
    const vals = [id]
    const placeholders = ['?']
    const company_id = req.user.company_id || 'default'
    sets.push('company_id')
    vals.push(company_id)
    placeholders.push('?')
    for (const field of INSERT_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        sets.push(field)
        vals.push(req.body[field])
        placeholders.push('?')
      }
    }
    await req.db.execute({
      sql: `INSERT INTO alunos (${sets.join(', ')}) VALUES (${placeholders.join(', ')})`,
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
    for (const field of INSERT_FIELDS) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`)
        args.push(req.body[field])
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    sets.push("updated_at = datetime('now')")
    args.push(req.params.id)
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? `UPDATE alunos SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE alunos SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
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
        ? 'DELETE FROM aluno_anexos WHERE aluno_id = ?'
        : 'DELETE FROM aluno_anexos WHERE aluno_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM alunos WHERE id = ?'
        : 'DELETE FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/anexos', async (req, res) => {
  try {
    const { categoria, filename, data, type } = req.body
    if (!categoria || !filename || !data || !type) {
      return res.status(400).json({ error: 'categoria, filename, data, type required' })
    }
    const id = crypto.randomUUID()
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: 'INSERT INTO aluno_anexos (id, aluno_id, categoria, filename, data, type, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, req.params.id, categoria, filename, data, type, company_id],
    })
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/anexos/:anexoId', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM aluno_anexos WHERE id = ?'
        : 'DELETE FROM aluno_anexos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.anexoId] : [req.params.anexoId, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
