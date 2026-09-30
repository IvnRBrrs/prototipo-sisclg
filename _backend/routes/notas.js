import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope, isTurmaDisciplinaInScope, isAlunoInScope, alunosBelongToTurma } from '../teacherScope.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.PROFESSOR))

function parseNota(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatMedia(value) {
  return Math.round(value * 100) / 100
}

router.get('/', async (req, res) => {
  try {
    const { turma_id, disciplina_id, bimestre, ano_letivo } = req.query
    if (!turma_id || !disciplina_id) return res.status(400).json({ error: 'turma_id and disciplina_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    // Professor só acessa notas das suas turmas e disciplinas alocadas
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = await isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), String(disciplina_id))
      if (!ok) return res.status(403).json({ error: 'Forbidden: você só pode acessar suas turmas e disciplinas' })
    }

    const ano = ano_letivo || String(new Date().getFullYear())
    const bim = bimestre ? Number(bimestre) : 1
    const result = await req.db.execute({
      sql: `SELECT a.id as aluno_id, a.nome as aluno_nome,
                   n.id as nota_id, n.nota, n.faltas
            FROM aluno_turmas at
            JOIN alunos a ON a.id = at.aluno_id
            LEFT JOIN notas n ON n.aluno_id = a.id
              AND n.disciplina_id = ? AND n.turma_id = ?
              AND n.bimestre = ? AND n.ano_letivo = ? AND n.company_id = ?
            WHERE at.turma_id = ?` + (isSuper ? '' : ' AND at.company_id = ?') + `
            ORDER BY a.nome`,
      args: isSuper
        ? [String(disciplina_id), String(turma_id), bim, ano, company_id, String(turma_id)]
        : [String(disciplina_id), String(turma_id), bim, ano, company_id, String(turma_id), company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/bulk', async (req, res) => {
  try {
    const { turma_id, disciplina_id, ano_letivo, bimestre, items } = req.body
    if (!turma_id || !disciplina_id || !Array.isArray(items)) {
      return res.status(400).json({ error: 'turma_id, disciplina_id and items[] required' })
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

    // Professor só lança notas nas suas turmas e disciplinas alocadas
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = await isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), String(disciplina_id))
      if (!ok) return res.status(403).json({ error: 'Forbidden: você só pode lançar notas nas suas turmas e disciplinas' })
    }

    // Nenhum aluno fora da turma pode receber nota
    const alunoIds = items.map((i) => i.aluno_id).filter(Boolean)
    if (alunoIds.length > 0) {
      const pertence = await alunosBelongToTurma(req.db, String(turma_id), company_id, alunoIds)
      if (!pertence) return res.status(403).json({ error: 'Forbidden: aluno não pertence à turma' })
    }

    const ano = ano_letivo || String(new Date().getFullYear())
    const bim = bimestre ? Number(bimestre) : 1
    let updated = 0
    for (const item of items) {
      if (!item.aluno_id) continue
      const existing = await req.db.execute({
        sql: 'SELECT id FROM notas WHERE aluno_id = ? AND disciplina_id = ? AND turma_id = ? AND bimestre = ? AND ano_letivo = ? AND company_id = ?',
        args: [item.aluno_id, String(disciplina_id), String(turma_id), bim, ano, company_id],
      })
      if (existing.rows.length > 0) {
        await req.db.execute({
          sql: 'UPDATE notas SET nota = ?, faltas = ? WHERE id = ?',
          args: [item.nota !== undefined ? String(item.nota) : '', item.faltas !== undefined ? Number(item.faltas) || 0 : 0, existing.rows[0].id],
        })
      } else {
        await req.db.execute({
          sql: 'INSERT INTO notas (id, aluno_id, disciplina_id, turma_id, ano_letivo, bimestre, nota, faltas, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            crypto.randomUUID(), item.aluno_id, String(disciplina_id), String(turma_id),
            ano, bim, item.nota !== undefined ? String(item.nota) : '', item.faltas !== undefined ? Number(item.faltas) || 0 : 0, company_id,
          ],
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

router.get('/boletim/:alunoId', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const ano = req.query.ano_letivo || String(new Date().getFullYear())

    const aluno = await req.db.execute({
      sql: isSuper
        ? 'SELECT id, nome FROM alunos WHERE id = ?'
        : 'SELECT id, nome FROM alunos WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.alunoId] : [req.params.alunoId, company_id],
    })
    if (aluno.rows.length === 0) return res.status(404).json({ error: 'Aluno not found' })

    // Professor só vê boletim de alunos das suas turmas
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const ok = await isAlunoInScope(req.db, scope, company_id, req.params.alunoId)
      if (!ok) return res.status(403).json({ error: 'Forbidden: aluno não pertence às suas turmas' })
    }

    const notas = await req.db.execute({
      sql: `SELECT n.*, d.nome as disciplina_nome, d.abreviatura, t.nome as turma_nome
            FROM notas n
            JOIN disciplinas d ON d.id = n.disciplina_id
            LEFT JOIN turmas t ON t.id = n.turma_id
            WHERE n.aluno_id = ? AND n.ano_letivo = ? AND n.company_id = ?` + (isSuper ? '' : '') + `
            ORDER BY d.nome, n.bimestre`,
      args: [req.params.alunoId, ano, company_id],
    })

    const rows = rowsToObjects(notas.rows, notas.columns)
    const byDisciplina = {}
    let turmaNome = ''
    for (const row of rows) {
      turmaNome = row.turma_nome || turmaNome
      if (!byDisciplina[row.disciplina_id]) {
        byDisciplina[row.disciplina_id] = {
          disciplina_id: row.disciplina_id,
          disciplina_nome: row.disciplina_nome,
          abreviatura: row.abreviatura || '',
          bimestres: {},
          faltas: 0,
        }
      }
      const d = byDisciplina[row.disciplina_id]
      d.bimestres[row.bimestre] = row.nota
      d.faltas += Number(row.faltas) || 0
    }

    const disciplinas = Object.values(byDisciplina).map((d) => {
      const values = []
      for (let b = 1; b <= 4; b++) {
        const raw = d.bimestres[b]
        values.push(raw !== undefined ? raw : '')
      }
      const parsed = values.map(parseNota).filter((n) => n !== null)
      const media = parsed.length > 0 ? formatMedia(parsed.reduce((a, b) => a + b, 0) / parsed.length) : null
      return { ...d, notas_bimestres: values, media, total_faltas: d.faltas }
    })

    res.json({ aluno: aluno.rows[0].nome, turma_nome: turmaNome, ano_letivo: ano, disciplinas })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    // Professor só exclui notas das suas turmas e disciplinas
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const n = await req.db.execute({
        sql: 'SELECT turma_id, disciplina_id FROM notas WHERE id = ?',
        args: [req.params.id],
      })
      if (n.rows.length === 0) return res.status(404).json({ error: 'Nota not found' })
      const ok = await isTurmaDisciplinaInScope(req.db, scope, company_id, String(n.rows[0].turma_id || ''), String(n.rows[0].disciplina_id || ''))
      if (!ok) return res.status(403).json({ error: 'Forbidden: nota fora do seu escopo' })
    }
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM notas WHERE id = ?'
        : 'DELETE FROM notas WHERE id = ? AND company_id = ?',
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Nota not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
