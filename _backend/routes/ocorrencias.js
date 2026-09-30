import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope, isAlunoInScope } from '../teacherScope.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.PROFESSOR))

const FIELDS = ['aluno_id', 'tipo', 'descricao', 'data', 'responsavel_id']

router.get('/', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)
    if (scope !== null && !scope) {
      return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
    }
    let sql = `SELECT o.*, a.nome as aluno_nome
               FROM ocorrencias o
               LEFT JOIN alunos a ON a.id = o.aluno_id`
    const args = []
    const conditions = []
    if (!isSuper) {
      conditions.push('o.company_id = ?')
      args.push(company_id)
    }
    if (scope) {
      // Professor só vê ocorrências dos alunos das suas turmas
      conditions.push(`o.aluno_id IN (
        SELECT DISTINCT at.aluno_id FROM aluno_turmas at
        JOIN turmas t ON t.id = at.turma_id
        WHERE at.company_id = ? AND (
          t.professor_responsavel_id = ? OR t.id IN (
            SELECT turma_id FROM turma_disciplinas WHERE professor_id = ? AND company_id = ?
          )
        )
      )`)
      args.push(company_id, scope, scope, company_id)
    }
    if (req.query.aluno_id) {
      conditions.push('o.aluno_id = ?')
      args.push(String(req.query.aluno_id))
    }
    if (req.query.tipo) {
      conditions.push('o.tipo = ?')
      args.push(String(req.query.tipo))
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY o.data DESC, o.created_at DESC'
    const result = await req.db.execute({ sql, args })
    // can_edit: gestores editam tudo; professor só as próprias ocorrências
    const rows = rowsToObjects(result.rows, result.columns)
    res.json(rows.map((o) => ({ ...o, can_edit: scope === null ? true : String(o.responsavel_id || '') === scope })))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)
    if (scope !== null && !scope) {
      return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
    }
    const result = await req.db.execute({
      sql: `SELECT o.*, a.nome as aluno_nome
            FROM ocorrencias o
            LEFT JOIN alunos a ON a.id = o.aluno_id
            WHERE o.id = ?` + (isSuper ? '' : ' AND o.company_id = ?'),
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ocorrencia not found' })
    const row = rowsToObjects(result.rows, result.columns)[0]
    if (scope) {
      const ok = await isAlunoInScope(req.db, scope, company_id, row.aluno_id)
      if (!ok) return res.status(403).json({ error: 'Forbidden: aluno não pertence às suas turmas' })
      row.can_edit = String(row.responsavel_id || '') === scope
    } else {
      row.can_edit = true
    }
    res.json(row)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/', async (req, res) => {
  try {
    const { aluno_id, tipo, descricao, data, responsavel_id } = req.body
    if (!aluno_id) return res.status(400).json({ error: 'aluno_id required' })
    if (!descricao || !String(descricao).trim()) return res.status(400).json({ error: 'descricao required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)

    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      // Professor só registra ocorrências de alunos das suas turmas
      const ok = await isAlunoInScope(req.db, scope, company_id, aluno_id)
      if (!ok) return res.status(403).json({ error: 'Forbidden: aluno não pertence às suas turmas' })
    }

    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM alunos WHERE id = ?'
        : 'SELECT id FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [aluno_id] : [aluno_id, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    const id = crypto.randomUUID()
    // O responsável é sempre o professor autenticado (nunca aceito do body)
    const resp = scope || String(responsavel_id || '')
    await req.db.execute({
      sql: 'INSERT INTO ocorrencias (id, aluno_id, data, tipo, descricao, responsavel_id, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, aluno_id, data || new Date().toISOString().slice(0, 10), tipo || 'outra', String(descricao).trim(), resp, company_id],
    })
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)

    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      // Professor só edita as próprias ocorrências
      const row = await req.db.execute({
        sql: 'SELECT responsavel_id, aluno_id FROM ocorrencias WHERE id = ?',
        args: [req.params.id],
      })
      if (row.rows.length === 0) return res.status(404).json({ error: 'Ocorrencia not found' })
      if (String(row.rows[0].responsavel_id || '') !== scope) {
        return res.status(403).json({ error: 'Forbidden: você só pode editar as próprias ocorrências' })
      }
      if (req.body.aluno_id !== undefined && String(req.body.aluno_id) !== String(row.rows[0].aluno_id)) {
        const ok = await isAlunoInScope(req.db, scope, company_id, String(req.body.aluno_id))
        if (!ok) return res.status(403).json({ error: 'Forbidden: aluno fora do seu escopo' })
      }
      // Professor nunca troca o responsável da ocorrência
      delete req.body.responsavel_id
    }

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
    const result = await req.db.execute({
      sql: isSuper
        ? `UPDATE ocorrencias SET ${sets.join(', ')} WHERE id = ?`
        : `UPDATE ocorrencias SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      args: isSuper ? args : [...args, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Ocorrencia not found' })
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
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      // Professor só exclui as próprias ocorrências
      const row = await req.db.execute({
        sql: 'SELECT responsavel_id FROM ocorrencias WHERE id = ?',
        args: [req.params.id],
      })
      if (row.rows.length === 0) return res.status(404).json({ error: 'Ocorrencia not found' })
      if (String(row.rows[0].responsavel_id || '') !== scope) {
        return res.status(403).json({ error: 'Forbidden: você só pode excluir as próprias ocorrências' })
      }
    }
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM ocorrencias WHERE id = ?'
        : 'DELETE FROM ocorrencias WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Ocorrencia not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
