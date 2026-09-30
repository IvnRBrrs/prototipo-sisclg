import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope, isTurmaInScope, isTurmaDisciplinaInScope, isAlunoInScope, alunosBelongToTurma } from '../teacherScope.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.PROFESSOR))

router.get('/', async (req, res) => {
  try {
    const { turma_id, disciplina_id, data } = req.query
    if (!turma_id || !data) return res.status(400).json({ error: 'turma_id and data required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    // Professor só acessa frequência das suas turmas (e disciplinas alocadas)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const disc = String(disciplina_id || '')
      const ok = disc
        ? await isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), disc)
        : await isTurmaInScope(req.db, scope, company_id, String(turma_id))
      if (!ok) return res.status(403).json({ error: 'Forbidden: turma/disciplina fora do seu escopo' })
    }

    const result = await req.db.execute({
      sql: `SELECT a.id as aluno_id, a.nome as aluno_nome,
                   f.id as frequencia_id, f.status, f.disciplina_id
            FROM aluno_turmas at
            JOIN alunos a ON a.id = at.aluno_id
            LEFT JOIN frequencia f ON f.aluno_id = a.id
              AND f.turma_id = ? AND f.data = ? AND f.company_id = ?
              AND (f.disciplina_id = ? OR (f.disciplina_id = '' AND ? = ''))
            WHERE at.turma_id = ?` + (isSuper ? '' : ' AND at.company_id = ?') + `
            ORDER BY a.nome`,
      args: isSuper
        ? [String(turma_id), String(data), company_id, String(disciplina_id || ''), String(disciplina_id || ''), String(turma_id)]
        : [String(turma_id), String(data), company_id, String(disciplina_id || ''), String(disciplina_id || ''), String(turma_id), company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/bulk', async (req, res) => {
  try {
    const { turma_id, disciplina_id, data, items } = req.body
    if (!turma_id || !data || !Array.isArray(items)) {
      return res.status(400).json({ error: 'turma_id, data and items[] required' })
    }
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    // Professor só lança frequência nas suas turmas (e disciplinas alocadas)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const disc = String(disciplina_id || '')
      const ok = disc
        ? await isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), disc)
        : await isTurmaInScope(req.db, scope, company_id, String(turma_id))
      if (!ok) return res.status(403).json({ error: 'Forbidden: turma/disciplina fora do seu escopo' })
    }

    // Nenhum aluno fora da turma pode ter frequência lançada
    const alunoIds = items.map((i) => i.aluno_id).filter(Boolean)
    if (alunoIds.length > 0) {
      const pertence = await alunosBelongToTurma(req.db, String(turma_id), company_id, alunoIds)
      if (!pertence) return res.status(403).json({ error: 'Forbidden: aluno não pertence à turma' })
    }

    let updated = 0
    for (const item of items) {
      if (!item.aluno_id) continue
      const status = item.status || 'presente'
      const existing = await req.db.execute({
        sql: 'SELECT id FROM frequencia WHERE aluno_id = ? AND turma_id = ? AND data = ? AND disciplina_id = ? AND company_id = ?',
        args: [item.aluno_id, String(turma_id), String(data), String(disciplina_id || ''), company_id],
      })
      if (existing.rows.length > 0) {
        await req.db.execute({
          sql: 'UPDATE frequencia SET status = ? WHERE id = ?',
          args: [status, existing.rows[0].id],
        })
      } else {
        await req.db.execute({
          sql: 'INSERT INTO frequencia (id, aluno_id, turma_id, data, disciplina_id, status, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), item.aluno_id, String(turma_id), String(data), String(disciplina_id || ''), status, company_id],
        })
      }
      updated++
    }
    res.json({ success: true, updated })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.get('/resumo/:alunoId', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const turma_id = req.query.turma_id ? String(req.query.turma_id) : ''
    const ano = req.query.ano_letivo || String(new Date().getFullYear())

    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT id, nome FROM alunos WHERE id = ?'
        : 'SELECT id, nome FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.alunoId] : [req.params.alunoId, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    // Professor só vê resumo de alunos das suas turmas
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = await isAlunoInScope(req.db, scope, company_id, req.params.alunoId)
      if (!ok) return res.status(403).json({ error: 'Forbidden: aluno não pertence às suas turmas' })
    }

    let sql = `SELECT status, COUNT(*) AS c FROM frequencia
               WHERE aluno_id = ? AND company_id = ? AND substr(data, 1, 4) = ?`
    const args = [req.params.alunoId, company_id, ano]
    if (turma_id) {
      sql += ' AND turma_id = ?'
      args.push(turma_id)
    }
    sql += ' GROUP BY status'
    const result = await req.db.execute({ sql, args })

    let total = 0
    let presencas = 0
    let ausencias = 0
    let justificadas = 0
    for (const row of result.rows) {
      total += Number(row.c)
      if (row.status === 'presente') presencas = Number(row.c)
      else if (row.status === 'ausente') ausencias = Number(row.c)
      else if (row.status === 'justificado') justificadas = Number(row.c)
    }
    const percentual = total > 0 ? Math.round(((presencas + justificadas) / total) * 1000) / 10 : null
    res.json({
      aluno_nome: aluno.rows[0].nome,
      turma_id,
      ano_letivo: ano,
      total_chamadas: total,
      presencas,
      ausencias,
      justificadas,
      percentual_presenca: percentual,
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    // Professor só exclui frequência das suas turmas (e disciplinas alocadas)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const f = await req.db.execute({
        sql: 'SELECT turma_id, disciplina_id FROM frequencia WHERE id = ?',
        args: [req.params.id],
      })
      if (f.rows.length === 0) return res.status(404).json({ error: 'Registro not found' })
      const disc = String(f.rows[0].disciplina_id || '')
      const ok = disc
        ? await isTurmaDisciplinaInScope(req.db, scope, company_id, String(f.rows[0].turma_id || ''), disc)
        : await isTurmaInScope(req.db, scope, company_id, String(f.rows[0].turma_id || ''))
      if (!ok) return res.status(403).json({ error: 'Forbidden: registro fora do seu escopo' })
    }
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM frequencia WHERE id = ?'
        : 'DELETE FROM frequencia WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Registro not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
