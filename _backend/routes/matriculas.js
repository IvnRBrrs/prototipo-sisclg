import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.SECRETARIA_ESCOLAR, ROLES.FINANCEIRO))

const FIELDS = ['turma_id', 'ano_letivo', 'data_matricula', 'status']

function generateCodigoAcesso() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += charset[Math.floor(Math.random() * charset.length)]
  return code
}

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    let sql = `SELECT m.*, a.nome as aluno_nome, t.nome as turma_nome
               FROM matriculas m
               LEFT JOIN alunos a ON a.id = m.aluno_id
               LEFT JOIN turmas t ON t.id = m.turma_id`
    const args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('m.company_id = ?')
      args.push(company_id)
    }
    const search = (req.query.search || '').trim()
    if (search) {
      conditions.push('(a.nome LIKE ? OR m.numero LIKE ? OR m.codigo_acesso LIKE ?)')
      const p = `%${search}%`
      args.push(p, p, p)
    }
    if (req.query.status) {
      conditions.push('m.status = ?')
      args.push(String(req.query.status))
    }
    if (req.query.ano_letivo) {
      conditions.push('m.ano_letivo = ?')
      args.push(String(req.query.ano_letivo))
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY m.ano_letivo DESC, m.numero DESC'
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
      sql: `SELECT m.*, a.nome as aluno_nome, t.nome as turma_nome
            FROM matriculas m
            LEFT JOIN alunos a ON a.id = m.aluno_id
            LEFT JOIN turmas t ON t.id = m.turma_id
            WHERE m.id = ?` + (isSuper ? '' : ' AND m.company_id = ?'),
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Matricula not found' })
    res.json(rowsToObjects(result.rows, result.columns)[0])
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { aluno_id, turma_id, ano_letivo, origem, data_matricula, status } = req.body
    if (!aluno_id) return res.status(400).json({ error: 'aluno_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM alunos WHERE id = ?'
        : 'SELECT id FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [aluno_id] : [aluno_id, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    if (turma_id) {
      const turma = await req.db.execute({
        sql: isSuper
          ? 'SELECT id FROM turmas WHERE id = ?'
          : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
        args: isSuper ? [turma_id] : [turma_id, company_id],
      })
      if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })
    }

    const year = ano_letivo || String(new Date().getFullYear())
    const count = await req.db.execute({
      sql: 'SELECT COUNT(*) AS c FROM matriculas WHERE ano_letivo = ? AND company_id = ?',
      args: [year, company_id],
    })
    const numero = String(Number(count.rows[0].c) + 1).padStart(4, '0') + '/' + year

    let codigo = generateCodigoAcesso()
    for (let attempt = 0; attempt < 5; attempt++) {
      const dup = await req.db.execute({
        sql: 'SELECT 1 FROM matriculas WHERE codigo_acesso = ? AND company_id = ?',
        args: [codigo, company_id],
      })
      if (dup.rows.length === 0) break
      codigo = generateCodigoAcesso()
    }

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: 'INSERT INTO matriculas (id, aluno_id, turma_id, ano_letivo, numero, codigo_acesso, data_matricula, status, origem, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        id, aluno_id, turma_id || '', year, numero, codigo,
        data_matricula || new Date().toISOString().slice(0, 10),
        status || 'matriculado', origem || 'cliente', company_id,
      ],
    })
    res.json({ success: true, id, numero, codigo_acesso: codigo })
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
        ? `UPDATE matriculas SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE matriculas SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Matricula not found' })
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
        ? 'DELETE FROM matriculas WHERE id = ?'
        : 'DELETE FROM matriculas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Matricula not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/:id/rematricula', async (req, res) => {
  try {
    const { novo_ano_letivo, turma_id } = req.body
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const existing = await req.db.execute({
      sql: `SELECT m.aluno_id, a.nome as aluno_nome
            FROM matriculas m
            LEFT JOIN alunos a ON a.id = m.aluno_id
            WHERE m.id = ?` + (isSuper ? '' : ' AND m.company_id = ?'),
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Matricula not found' })
    const aluno_id = existing.rows[0].aluno_id

    const year = novo_ano_letivo || String(new Date().getFullYear())
    const count = await req.db.execute({
      sql: 'SELECT COUNT(*) AS c FROM matriculas WHERE ano_letivo = ? AND company_id = ?',
      args: [year, company_id],
    })
    const numero = String(Number(count.rows[0].c) + 1).padStart(4, '0') + '/' + year

    let codigo = generateCodigoAcesso()
    for (let attempt = 0; attempt < 5; attempt++) {
      const dup = await req.db.execute({
        sql: 'SELECT 1 FROM matriculas WHERE codigo_acesso = ? AND company_id = ?',
        args: [codigo, company_id],
      })
      if (dup.rows.length === 0) break
      codigo = generateCodigoAcesso()
    }

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: 'INSERT INTO matriculas (id, aluno_id, turma_id, ano_letivo, numero, codigo_acesso, data_matricula, status, origem, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        id, aluno_id, turma_id || '', year, numero, codigo,
        new Date().toISOString().slice(0, 10), 'matriculado', 'rematricula', company_id,
      ],
    })
    res.json({ success: true, id, numero, codigo_acesso: codigo, aluno_nome: existing.rows[0].aluno_nome })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
