import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO))

function parseNota(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

router.get('/', async (req, res) => {
  try {
    const { turma_id, bimestre, ano_letivo } = req.query
    if (!turma_id) return res.status(400).json({ error: 'turma_id required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id, nome FROM turmas WHERE id = ?'
        : 'SELECT id, nome FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const ano = ano_letivo || String(new Date().getFullYear())
    const bim = bimestre ? Number(bimestre) : 0

    const alunos = await req.db.execute({
      sql: `SELECT a.id as aluno_id, a.nome as aluno_nome
            FROM aluno_turmas at
            JOIN alunos a ON a.id = at.aluno_id
            WHERE at.turma_id = ?` + (isSuper ? '' : ' AND at.company_id = ?') + `
            ORDER BY a.nome`,
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    const alunoRows = rowsToObjects(alunos.rows, alunos.columns)
    if (alunoRows.length === 0) return res.json({ turma_nome: turma.rows[0].nome, ano_letivo: ano, bimestre: bim, alunos: [] })

    const alunoIds = alunoRows.map((a) => a.aluno_id)
    const placeholders = alunoIds.map(() => '?').join(', ')

    const notas = await req.db.execute({
      sql: `SELECT aluno_id, disciplina_id, bimestre, nota, faltas
            FROM notas
            WHERE turma_id = ? AND ano_letivo = ? AND company_id = ?
              AND aluno_id IN (${placeholders})` + (bim > 0 ? ' AND bimestre = ?' : ''),
      args: bim > 0
        ? [String(turma_id), ano, company_id, ...alunoIds, bim]
        : [String(turma_id), ano, company_id, ...alunoIds],
    })
    const notaRows = rowsToObjects(notas.rows, notas.columns)

    const ocorrencias = await req.db.execute({
      sql: `SELECT aluno_id, COUNT(*) AS c
            FROM ocorrencias
            WHERE company_id = ? AND aluno_id IN (${placeholders})
            GROUP BY aluno_id`,
      args: [company_id, ...alunoIds],
    })
    const ocorrenciaMap = {}
    for (const row of ocorrencias.rows) ocorrenciaMap[row.aluno_id] = Number(row.c)

    const pareceres = await req.db.execute({
      sql: `SELECT id, aluno_id, parecer, observacao
            FROM conselho_classe
            WHERE turma_id = ? AND ano_letivo = ? AND bimestre = ? AND company_id = ?
              AND aluno_id IN (${placeholders})`,
      args: [String(turma_id), ano, bim, company_id, ...alunoIds],
    })
    const parecerMap = {}
    for (const row of pareceres.rows) parecerMap[row.aluno_id] = { id: row.id, parecer: row.parecer, observacao: row.observacao }

    const resultado = alunoRows.map((a) => {
      const doAluno = notaRows.filter((n) => n.aluno_id === a.aluno_id)
      const valores = doAluno.map((n) => parseNota(n.nota)).filter((n) => n !== null)
      const media = valores.length > 0 ? Math.round((valores.reduce((x, y) => x + y, 0) / valores.length) * 100) / 100 : null
      const faltas = doAluno.reduce((x, n) => x + (Number(n.faltas) || 0), 0)
      return {
        ...a,
        media,
        total_faltas: faltas,
        total_ocorrencias: ocorrenciaMap[a.aluno_id] || 0,
        conselho_id: parecerMap[a.aluno_id]?.id || null,
        parecer: parecerMap[a.aluno_id]?.parecer || '',
        observacao: parecerMap[a.aluno_id]?.observacao || '',
      }
    })

    res.json({ turma_nome: turma.rows[0].nome, ano_letivo: ano, bimestre: bim, alunos: resultado })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

router.post('/bulk', async (req, res) => {
  try {
    const { turma_id, ano_letivo, bimestre, items } = req.body
    if (!turma_id || !Array.isArray(items)) return res.status(400).json({ error: 'turma_id and items[] required' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const ano = ano_letivo || String(new Date().getFullYear())
    const bim = bimestre ? Number(bimestre) : 0
    let updated = 0
    for (const item of items) {
      if (!item.aluno_id) continue
      const existing = await req.db.execute({
        sql: 'SELECT id FROM conselho_classe WHERE aluno_id = ? AND turma_id = ? AND ano_letivo = ? AND bimestre = ? AND company_id = ?',
        args: [item.aluno_id, String(turma_id), ano, bim, company_id],
      })
      if (existing.rows.length > 0) {
        await req.db.execute({
          sql: 'UPDATE conselho_classe SET parecer = ?, observacao = ? WHERE id = ?',
          args: [item.parecer || '', item.observacao || '', existing.rows[0].id],
        })
      } else {
        await req.db.execute({
          sql: 'INSERT INTO conselho_classe (id, turma_id, aluno_id, ano_letivo, bimestre, parecer, observacao, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), String(turma_id), item.aluno_id, ano, bim, item.parecer || '', item.observacao || '', company_id],
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

router.delete('/:id', async (req, res) => {
  try {
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'
    const result = await req.db.execute({
      sql: isSuper
        ? 'DELETE FROM conselho_classe WHERE id = ?'
        : 'DELETE FROM conselho_classe WHERE id = ? AND company_id = ?',
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
