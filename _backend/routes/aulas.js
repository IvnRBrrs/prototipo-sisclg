import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope, isTurmaInScope, isTurmaDisciplinaInScope, alunosBelongToTurma } from '../teacherScope.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.PROFESSOR))

const VALID_STATUS = ['presente', 'ausente', 'justificado']

// Data válida de verdade (rejeita 2026-31-99, etc.), não só o formato.
function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false
  const [y, m, d] = String(s).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// Opções de disciplina para registrar a aula de um dia numa turma.
// Professor: "Geral" (se turma no escopo) + apenas as disciplinas dele na turma.
// Coordenador/Gestor/Super: "Geral" + todas as disciplinas alocadas à turma.
router.get('/disciplinas', async (req, res) => {
  try {
    const turma_id = String(req.query.turma_id || '')
    if (!turma_id) return res.status(400).json({ error: 'turma_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [turma_id] : [turma_id, company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const inTurma = await isTurmaInScope(req.db, scope, company_id, turma_id)
      if (!inTurma) return res.status(403).json({ error: 'Forbidden: turma fora do seu escopo' })
    }

    const result = await req.db.execute({
      sql: `SELECT td.disciplina_id, d.nome, td.professor_id
            FROM turma_disciplinas td
            JOIN disciplinas d ON d.id = td.disciplina_id AND d.company_id = td.company_id
            WHERE td.turma_id = ?` + (isSuper ? '' : ' AND td.company_id = ?') + `
            ORDER BY d.nome`,
      args: isSuper ? [turma_id] : [turma_id, company_id],
    })
    let disciplinas = rowsToObjects(result.rows, result.columns)
    if (scope !== null) {
      disciplinas = disciplinas.filter((d) => String(d.professor_id || '') === scope)
    }
    res.json({
      geral: true,
      disciplinas,
    })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Aulas de um mês da turma (para o calendário), com contagens da chamada de cada aula.
router.get('/', async (req, res) => {
  try {
    const turma_id = String(req.query.turma_id || '')
    const mes = String(req.query.mes || '')
    if (!turma_id) return res.status(400).json({ error: 'turma_id required' })
    if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'mes required (YYYY-MM)' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [turma_id] : [turma_id, company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = await isTurmaInScope(req.db, scope, company_id, turma_id)
      if (!ok) return res.status(403).json({ error: 'Forbidden: turma fora do seu escopo' })
    }

    const aulasResult = await req.db.execute({
      sql: `SELECT a.id, a.turma_id, a.disciplina_id, a.data, a.conteudo, a.observacoes,
                   a.professor_id, a.created_at, a.updated_at, d.nome AS disciplina_nome
            FROM aulas a
            LEFT JOIN disciplinas d ON d.id = a.disciplina_id AND d.company_id = a.company_id
            WHERE a.turma_id = ? AND substr(a.data, 1, 7) = ?` + (isSuper ? '' : ' AND a.company_id = ?') + `
            ORDER BY a.data, d.nome`,
      args: isSuper ? [turma_id, mes] : [turma_id, mes, company_id],
    })
    const aulas = rowsToObjects(aulasResult.rows, aulasResult.columns)

    const freqResult = await req.db.execute({
      sql: `SELECT data, disciplina_id, status, COUNT(*) AS c
            FROM frequencia
            WHERE turma_id = ? AND substr(data, 1, 7) = ? AND company_id = ?
            GROUP BY data, disciplina_id, status`,
      args: [turma_id, mes, company_id],
    })
    const counts = {}
    for (const row of freqResult.rows) {
      const key = String(row.data) + '|' + String(row.disciplina_id || '')
      if (!counts[key]) counts[key] = { presentes: 0, ausentes: 0, justificados: 0 }
      if (row.status === 'presente') counts[key].presentes += Number(row.c)
      else if (row.status === 'ausente') counts[key].ausentes += Number(row.c)
      else if (row.status === 'justificado') counts[key].justificados += Number(row.c)
    }
    for (const aula of aulas) {
      const key = String(aula.data) + '|' + String(aula.disciplina_id || '')
      aula.presentes = counts[key]?.presentes || 0
      aula.ausentes = counts[key]?.ausentes || 0
      aula.justificados = counts[key]?.justificados || 0
    }
    res.json({ aulas })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Upsert da aula do dia (por turma + data + disciplina) e, opcionalmente,
// da chamada completa (presenças/faltas) — tudo numa transação.
router.post('/', async (req, res) => {
  try {
    const { turma_id, disciplina_id, data, conteudo, observacoes, chamada } = req.body
    if (!turma_id || !data) return res.status(400).json({ error: 'turma_id and data required' })
    if (!isValidDate(data)) return res.status(400).json({ error: 'data must be a valid YYYY-MM-DD date' })
    if (chamada !== undefined && !Array.isArray(chamada)) return res.status(400).json({ error: 'chamada must be an array' })
    for (const item of chamada || []) {
      if (!item.aluno_id) return res.status(400).json({ error: 'chamada item requires aluno_id' })
      if (item.status !== undefined && !VALID_STATUS.includes(String(item.status))) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` })
      }
    }
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const disc = String(disciplina_id || '')

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    // Professor só registra aula nas suas turmas (e disciplinas alocadas)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = disc
        ? await isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), disc)
        : await isTurmaInScope(req.db, scope, company_id, String(turma_id))
      if (!ok) return res.status(403).json({ error: 'Forbidden: turma/disciplina fora do seu escopo' })
    }

    // Nenhum aluno fora da turma pode ter chamada lançada
    const alunoIds = (chamada || []).map((i) => i.aluno_id).filter(Boolean)
    if (alunoIds.length > 0) {
      const pertence = await alunosBelongToTurma(req.db, String(turma_id), company_id, alunoIds)
      if (!pertence) return res.status(403).json({ error: 'Forbidden: aluno não pertence à turma' })
    }

    await req.db.execute('BEGIN')
    try {
      const existing = await req.db.execute({
        sql: 'SELECT id FROM aulas WHERE turma_id = ? AND data = ? AND disciplina_id = ? AND company_id = ?',
        args: [String(turma_id), String(data), disc, company_id],
      })
      let aulaId
      if (existing.rows.length > 0) {
        aulaId = existing.rows[0].id
        await req.db.execute({
          sql: 'UPDATE aulas SET conteudo = ?, observacoes = ?, updated_at = datetime(\'now\') WHERE id = ?',
          args: [String(conteudo || ''), String(observacoes || ''), aulaId],
        })
      } else {
        aulaId = crypto.randomUUID()
        await req.db.execute({
          sql: `INSERT INTO aulas (id, turma_id, disciplina_id, data, conteudo, observacoes, professor_id, company_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [aulaId, String(turma_id), disc, String(data), String(conteudo || ''), String(observacoes || ''), scope !== null ? scope : '', company_id],
        })
      }

      let updated = 0
      for (const item of chamada || []) {
        if (!item.aluno_id) continue
        const status = VALID_STATUS.includes(String(item.status)) ? String(item.status) : 'presente'
        const freqExisting = await req.db.execute({
          sql: 'SELECT id FROM frequencia WHERE aluno_id = ? AND turma_id = ? AND data = ? AND disciplina_id = ? AND company_id = ?',
          args: [item.aluno_id, String(turma_id), String(data), disc, company_id],
        })
        if (freqExisting.rows.length > 0) {
          await req.db.execute({
            sql: 'UPDATE frequencia SET status = ? WHERE id = ?',
            args: [status, freqExisting.rows[0].id],
          })
        } else {
          await req.db.execute({
            sql: 'INSERT INTO frequencia (id, aluno_id, turma_id, data, disciplina_id, status, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [crypto.randomUUID(), item.aluno_id, String(turma_id), String(data), disc, status, company_id],
          })
        }
        updated++
      }
      await req.db.execute('COMMIT')
      res.json({ success: true, aula_id: aulaId, chamada_updated: updated })
    } catch (e) {
      await req.db.execute('ROLLBACK').catch(() => {})
      throw e
    }
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Excluir uma aula desfaz o registro completo do dia para aquela
// turma/disciplina: remove a aula E a chamada (frequencia) correspondente.
router.delete('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const aula = await req.db.execute({
      sql: isSuper
        ? 'SELECT id, turma_id, disciplina_id, data, company_id FROM aulas WHERE id = ?'
        : 'SELECT id, turma_id, disciplina_id, data, company_id FROM aulas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (aula.rows.length === 0) return res.status(404).json({ error: 'Aula not found' })
    const aulaCompany = String(aula.rows[0].company_id || 'default')

    // Professor só exclui aulas das suas turmas (e disciplinas alocadas)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const disc = String(aula.rows[0].disciplina_id || '')
      const ok = disc
        ? await isTurmaDisciplinaInScope(req.db, scope, company_id, String(aula.rows[0].turma_id || ''), disc)
        : await isTurmaInScope(req.db, scope, company_id, String(aula.rows[0].turma_id || ''))
      if (!ok) return res.status(403).json({ error: 'Forbidden: registro fora do seu escopo' })
    }

    await req.db.execute('BEGIN')
    try {
      await req.db.execute({
        sql: 'DELETE FROM frequencia WHERE turma_id = ? AND data = ? AND disciplina_id = ? AND company_id = ?',
        args: [String(aula.rows[0].turma_id), String(aula.rows[0].data), String(aula.rows[0].disciplina_id || ''), aulaCompany],
      })
      await req.db.execute({ sql: 'DELETE FROM aulas WHERE id = ?', args: [req.params.id] })
      await req.db.execute('COMMIT')
      res.json({ success: true })
    } catch (e) {
      await req.db.execute('ROLLBACK').catch(() => {})
      throw e
    }
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
