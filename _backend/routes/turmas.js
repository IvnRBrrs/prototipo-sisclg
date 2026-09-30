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
      // Professor só vê as turmas em que é responsável ou onde leciona
      const pid = req.user.professor_id || ''
      if (!pid) return res.json([])
      sql = `SELECT id, nome, serie, periodo, ano_letivo FROM turmas
             WHERE company_id = ?
               AND (professor_responsavel_id = ? OR id IN (SELECT turma_id FROM turma_disciplinas WHERE professor_id = ? AND company_id = ?))
             ORDER BY serie, nome`
      args = [company_id, pid, pid, company_id]
    } else {
      sql = `SELECT id, nome, serie, periodo, ano_letivo FROM turmas` + (isSuper ? '' : ' WHERE company_id = ?') + ' ORDER BY serie, nome'
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

const FIELDS = ['nome', 'serie', 'periodo', 'sala', 'ano_letivo', 'professor_responsavel_id', 'status']

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = 'SELECT * FROM turmas'
    const args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('company_id = ?')
      args.push(company_id)
    }
    const search = (req.query.search || '').trim()
    if (search) {
      conditions.push('(nome LIKE ? OR serie LIKE ?)')
      const p = `%${search}%`
      args.push(p, p)
    }
    if (req.query.serie) {
      conditions.push('serie = ?')
      args.push(String(req.query.serie))
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY serie, nome'
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
        ? 'SELECT * FROM turmas WHERE id = ?'
        : 'SELECT * FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })
    res.json(rowsToObjects(result.rows, result.columns)[0])
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body.nome || !String(req.body.nome).trim()) {
      return res.status(400).json({ error: 'nome é obrigatório' })
    }
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
      sql: `INSERT INTO turmas (${sets.join(', ')}) VALUES (${placeholders.join(', ')})`,
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
        ? `UPDATE turmas SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE turmas SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Turma not found' })
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
        ? 'DELETE FROM turma_disciplinas WHERE turma_id = ?'
        : 'DELETE FROM turma_disciplinas WHERE turma_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM aluno_turmas WHERE turma_id = ?'
        : 'DELETE FROM aluno_turmas WHERE turma_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM notas WHERE turma_id = ?'
        : 'DELETE FROM notas WHERE turma_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM frequencia WHERE turma_id = ?'
        : 'DELETE FROM frequencia WHERE turma_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM conselho_classe WHERE turma_id = ?'
        : 'DELETE FROM conselho_classe WHERE turma_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    await req.db.execute({
      sql: isSuper
        ? "UPDATE matriculas SET turma_id = '' WHERE turma_id = ?"
        : "UPDATE matriculas SET turma_id = '' WHERE turma_id = ? AND company_id = ?",
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM turmas WHERE id = ?'
        : 'DELETE FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Turma not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id/alunos', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: `SELECT a.id, a.nome, a.sexo, a.ano_letivo_atual, a.turma, a.company_id,
                   at.id as aluno_turma_id, at.status as enturmacao_status, at.ano_letivo as enturmacao_ano
            FROM aluno_turmas at
            JOIN alunos a ON a.id = at.aluno_id
            WHERE at.turma_id = ?` + (isSuper ? '' : ' AND at.company_id = ?') + `
            ORDER BY a.nome`,
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/alunos', async (req, res) => {
  try {
    const { aluno_id, ano_letivo, status } = req.body
    if (!aluno_id) return res.status(400).json({ error: 'aluno_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM alunos WHERE id = ?'
        : 'SELECT id FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [aluno_id] : [aluno_id, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    const exists = await req.db.execute({
      sql: 'SELECT 1 FROM aluno_turmas WHERE aluno_id = ? AND turma_id = ? AND company_id = ?',
      args: [aluno_id, req.params.id, company_id],
    })
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Aluno already in this turma' })

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: 'INSERT INTO aluno_turmas (id, aluno_id, turma_id, ano_letivo, status, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, aluno_id, req.params.id, ano_letivo || '', status || 'ativo', company_id],
    })
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id/alunos/:alunoId', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM aluno_turmas WHERE turma_id = ? AND aluno_id = ?'
        : 'DELETE FROM aluno_turmas WHERE turma_id = ? AND aluno_id = ? AND company_id = ?',
      args: isSuper ? [req.params.id, req.params.alunoId] : [req.params.id, req.params.alunoId, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Aluno not found in turma' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id/disciplinas', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: `SELECT td.id as turma_disciplina_id, td.professor_id,
                   d.id as disciplina_id, d.nome as disciplina_nome, d.abreviatura,
                   p.nome as professor_nome
            FROM turma_disciplinas td
            JOIN disciplinas d ON d.id = td.disciplina_id
            LEFT JOIN professores p ON p.id = td.professor_id
            WHERE td.turma_id = ?` + (isSuper ? '' : ' AND td.company_id = ?') + `
            ORDER BY d.nome`,
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/disciplinas', async (req, res) => {
  try {
    const { disciplina_id, professor_id } = req.body
    if (!disciplina_id) return res.status(400).json({ error: 'disciplina_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const disciplina = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM disciplinas WHERE id = ?'
        : 'SELECT id FROM disciplinas WHERE id = ? AND company_id = ?',
      args: isSuper ? [disciplina_id] : [disciplina_id, company_id],
    })
    if (disciplina.rows.length === 0) return res.status(404).json({ error: 'Disciplina not found' })

    const exists = await req.db.execute({
      sql: 'SELECT 1 FROM turma_disciplinas WHERE turma_id = ? AND disciplina_id = ? AND company_id = ?',
      args: [req.params.id, disciplina_id, company_id],
    })
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Disciplina already linked to this turma' })

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: 'INSERT INTO turma_disciplinas (id, turma_id, disciplina_id, professor_id, company_id) VALUES (?, ?, ?, ?, ?)',
      args: [id, req.params.id, disciplina_id, professor_id || '', company_id],
    })
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id/disciplinas/:tdId', async (req, res) => {
  try {
    const { professor_id } = req.body
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'UPDATE turma_disciplinas SET professor_id = ? WHERE id = ?'
        : 'UPDATE turma_disciplinas SET professor_id = ? WHERE id = ? AND company_id = ?',
      args: isSuper ? [professor_id || '', req.params.tdId] : [professor_id || '', req.params.tdId, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Vínculo not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id/disciplinas/:tdId', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM turma_disciplinas WHERE id = ?'
        : 'DELETE FROM turma_disciplinas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.tdId] : [req.params.tdId, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Vínculo not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
