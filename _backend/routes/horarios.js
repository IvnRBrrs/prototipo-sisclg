import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope } from '../teacherScope.js'

const router = Router()

// Leitura: super/gestor/coordenador/secretaria veem todas as grades;
// professor vê somente as próprias aulas (escopo forçado no servidor).
const READ_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO,
  ROLES.SECRETARIA_ESCOLAR, ROLES.PROFESSOR,
]
// Escrita: apenas super/gestor.
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN]

const AULA_SELECT = `SELECT h.*,
  d.nome as disciplina_nome, d.abreviatura,
  p.nome as professor_nome,
  t.nome as turma_nome, t.serie as turma_serie, t.periodo as turma_periodo
  FROM horario_aulas h
  JOIN turma_disciplinas td ON td.id = h.turma_disciplina_id
  JOIN disciplinas d ON d.id = h.disciplina_id
  LEFT JOIN professores p ON p.id = h.professor_id
  JOIN turmas t ON t.id = h.turma_id`

// Valida um slot (turma_disciplina + dia + aula) e deriva turma/disciplina/
// professor/periodo a partir do vínculo existente em turma_disciplinas.
// Retorna { ok: true, data } ou { ok: false, status, message }.
async function resolveSlot(db, companyId, turmaDisciplinaId, diaSemana, aulaNum) {
  if (!turmaDisciplinaId) return { ok: false, status: 400, message: 'turma_disciplina_id é obrigatório' }
  const dia = Number(diaSemana)
  const aula = Number(aulaNum)
  if (!Number.isInteger(dia) || dia < 1 || dia > 5) return { ok: false, status: 400, message: 'dia_semana deve ser um número entre 1 (segunda) e 5 (sexta)' }
  if (!Number.isInteger(aula) || aula < 1 || aula > 6) return { ok: false, status: 400, message: 'aula_num deve ser um número entre 1 e 6' }

  const tdResult = await db.execute({
    sql: 'SELECT * FROM turma_disciplinas WHERE id = ? AND company_id = ?',
    args: [String(turmaDisciplinaId), companyId],
  })
  if (tdResult.rows.length === 0) return { ok: false, status: 404, message: 'Vínculo turma/disciplina not found' }
  const td = rowsToObjects(tdResult.rows, tdResult.columns)[0]

  const turmaResult = await db.execute({
    sql: 'SELECT id, nome, periodo, company_id FROM turmas WHERE id = ? AND company_id = ?',
    args: [String(td.turma_id), companyId],
  })
  if (turmaResult.rows.length === 0) return { ok: false, status: 404, message: 'Turma not found' }
  const turma = rowsToObjects(turmaResult.rows, turmaResult.columns)[0]

  if (!td.professor_id) {
    return { ok: false, status: 400, message: 'Este vínculo não possui professor definido — defina o professor na turma antes de marcar a aula' }
  }

  return {
    ok: true,
    data: {
      td,
      turma,
      disciplina_id: td.disciplina_id,
      professor_id: td.professor_id,
      periodo: turma.periodo || '',
    },
  }
}

// Verifica conflitos de slot (excluindo o id informado, quando for edição).
async function checkSlotConflict(db, companyId, data, excludeId) {
  const { turma, disciplina_id, professor_id, periodo } = data
  const dia = Number(data.dia_semana)
  const aula = Number(data.aula_num)
  const excl = excludeId ? ' AND h.id != ?' : ''
  const exclArgs = excludeId ? [excludeId] : []

  const turmaBusy = await db.execute({
    sql: `SELECT h.id, h.disciplina_id FROM horario_aulas h
          WHERE h.company_id = ? AND h.turma_id = ? AND h.dia_semana = ? AND h.aula_num = ?${excl} LIMIT 1`,
    args: [companyId, turma.id, dia, aula, ...exclArgs],
  })
  if (turmaBusy.rows.length > 0) {
    const busy = turmaBusy.rows[0]
    if (String(busy.disciplina_id) === String(disciplina_id)) {
      return { ok: false, status: 400, message: 'Esta disciplina já está marcada nesse horário' }
    }
    return { ok: false, status: 400, message: 'A turma já possui outra aula nesse horário. Marque a aula em outro slot' }
  }

  const profBusy = await db.execute({
    sql: `SELECT h.id, t.nome as turma_nome FROM horario_aulas h
          JOIN turmas t ON t.id = h.turma_id
          WHERE h.company_id = ? AND h.professor_id = ? AND h.periodo = ? AND h.dia_semana = ? AND h.aula_num = ?${excl} LIMIT 1`,
    args: [companyId, professor_id, periodo, dia, aula, ...exclArgs],
  })
  if (profBusy.rows.length > 0) {
    return { ok: false, status: 400, message: `Conflito: o professor já ministra aula na turma "${profBusy.rows[0].turma_nome}" nesse mesmo horário` }
  }
  return { ok: true }
}

// GET / — grade horária (filtros: turma_id, professor_id, periodo, ano_letivo).
// Professor: o filtro de professor é SEMPRE o seu próprio vínculo (escopo).
router.get('/', authMiddleware, requireRole(...READ_ROLES), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)
    if (scope !== null && !scope) {
      return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
    }

    const conditions = []
    const args = []
    if (!isSuper) {
      conditions.push('h.company_id = ?')
      args.push(company_id)
    }
    if (scope) {
      conditions.push('h.professor_id = ?')
      args.push(scope)
    }
    if (req.query.turma_id) {
      conditions.push('h.turma_id = ?')
      args.push(String(req.query.turma_id))
    }
    if (req.query.professor_id && !scope) {
      conditions.push('h.professor_id = ?')
      args.push(String(req.query.professor_id))
    }
    if (req.query.periodo) {
      conditions.push('h.periodo = ?')
      args.push(String(req.query.periodo))
    }
    if (req.query.ano_letivo) {
      conditions.push('h.ano_letivo = ?')
      args.push(String(req.query.ano_letivo))
    }

    let sql = AULA_SELECT
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY h.dia_semana, h.aula_num, t.nome'
    const result = await req.db.execute({ sql, args })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /me — grade do professor autenticado (apenas role professor).
router.get('/me', authMiddleware, requireRole(ROLES.PROFESSOR), async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const scope = String(req.user.professor_id || '')
    if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
    const result = await req.db.execute({
      sql: `${AULA_SELECT} WHERE h.company_id = ? AND h.professor_id = ? ORDER BY h.dia_semana, h.aula_num, t.nome`,
      args: [company_id, scope],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// GET /:id — uma aula específica.
router.get('/:id', authMiddleware, requireRole(...READ_ROLES), async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const scope = professorScope(req)
    if (scope !== null && !scope) {
      return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
    }
    const result = await req.db.execute({
      sql: `${AULA_SELECT} WHERE h.id = ?` + (isSuper ? '' : ' AND h.company_id = ?'),
      args: isSuper ? [req.params.id] : [req.params.id, company_id],
    })
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aula not found' })
    const row = rowsToObjects(result.rows, result.columns)[0]
    if (scope && String(row.professor_id || '') !== scope) {
      return res.status(403).json({ error: 'Forbidden: aula não pertence a você' })
    }
    res.json(row)
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// POST / — marca uma aula no slot (apenas super/gestor).
router.post('/', authMiddleware, requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const { turma_disciplina_id, dia_semana, aula_num, ano_letivo } = req.body

    const slot = await resolveSlot(req.db, company_id, turma_disciplina_id, dia_semana, aula_num)
    if (!slot.ok) return res.status(slot.status).json({ error: slot.message })

    const { td, turma, disciplina_id, professor_id, periodo } = slot.data
    const conflict = await checkSlotConflict(req.db, company_id, { turma, disciplina_id, professor_id, periodo, dia_semana, aula_num })
    if (!conflict.ok) return res.status(conflict.status).json({ error: conflict.message })

    const id = crypto.randomUUID()
    await req.db.execute({
      sql: `INSERT INTO horario_aulas (id, turma_disciplina_id, turma_id, disciplina_id, professor_id, periodo, dia_semana, aula_num, ano_letivo, company_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, td.id, turma.id, disciplina_id, professor_id, periodo, Number(dia_semana), Number(aula_num), ano_letivo || '', company_id],
    })
    res.json({ success: true, id })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// PUT /:id — move/edita uma aula (apenas super/gestor).
router.put('/:id', authMiddleware, requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const existing = await req.db.execute({
      sql: 'SELECT * FROM horario_aulas WHERE id = ? AND company_id = ?',
      args: [req.params.id, company_id],
    })
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Aula not found' })
    const current = rowsToObjects(existing.rows, existing.columns)[0]

    const turma_disciplina_id = req.body.turma_disciplina_id !== undefined ? req.body.turma_disciplina_id : current.turma_disciplina_id
    const dia_semana = req.body.dia_semana !== undefined ? req.body.dia_semana : current.dia_semana
    const aula_num = req.body.aula_num !== undefined ? req.body.aula_num : current.aula_num
    const ano_letivo = req.body.ano_letivo !== undefined ? req.body.ano_letivo : current.ano_letivo

    const slot = await resolveSlot(req.db, company_id, turma_disciplina_id, dia_semana, aula_num)
    if (!slot.ok) return res.status(slot.status).json({ error: slot.message })

    const { td, turma, disciplina_id, professor_id, periodo } = slot.data
    const conflict = await checkSlotConflict(req.db, company_id, { turma, disciplina_id, professor_id, periodo, dia_semana, aula_num }, req.params.id)
    if (!conflict.ok) return res.status(conflict.status).json({ error: conflict.message })

    await req.db.execute({
      sql: `UPDATE horario_aulas SET turma_disciplina_id = ?, turma_id = ?, disciplina_id = ?, professor_id = ?, periodo = ?, dia_semana = ?, aula_num = ?, ano_letivo = ? WHERE id = ? AND company_id = ?`,
      args: [td.id, turma.id, disciplina_id, professor_id, periodo, Number(dia_semana), Number(aula_num), ano_letivo || '', req.params.id, company_id],
    })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /:id — remove uma aula (apenas super/gestor).
router.delete('/:id', authMiddleware, requireRole(...WRITE_ROLES), async (req, res) => {
  try {
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: 'DELETE FROM horario_aulas WHERE id = ? AND company_id = ?',
      args: [req.params.id, company_id],
    })
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Aula not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
