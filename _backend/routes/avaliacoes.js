import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { ROLES } from '../roles.js'
import { rowsToObjects } from '../rows.js'
import { professorScope, isTurmaInScope, isTurmaDisciplinaInScope, alunosBelongToTurma } from '../teacherScope.js'

const router = Router()

router.use(authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.GESTOR_ADMIN, ROLES.COORDENADOR_PEDAGOGICO, ROLES.PROFESSOR))

const TIPOS = ['mensal', 'bimestral', 'trabalho1', 'trabalho2', 'trabalho3']

// Data válida de verdade (rejeita 2026-31-99, etc.), não só o formato.
function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false
  const [y, m, d] = String(s).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// Nota 0-10 (aceita vírgula): null = vazia (permitida); undefined = inválida (400).
function parseNotaAvaliacao(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const n = parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0 || n > 10) return undefined
  return Math.round(n * 100) / 100
}

function formatNota(n) {
  return String(n).replace('.', ',')
}

// Recompõe a nota bimestral consolidada do aluno (tabela `notas`) a partir da
// média simples das suas notas em todas as avaliações do mesmo bimestre,
// disciplina e ano. O campo `faltas` de `notas` jamais é tocado. Boletim,
// Conselho de Classe e Notas e Boletim leem dali — nada mais precisa mudar.
async function recomporNotasBimestre(db, { turma_id, disciplina_id, bimestre, ano, company_id, alunoIds }) {
  for (const alunoId of alunoIds) {
    const r = await db.execute({
      sql: `SELECT an.nota
            FROM avaliacao_notas an
            JOIN avaliacoes av ON av.id = an.avaliacao_id AND av.company_id = an.company_id
            WHERE an.aluno_id = ? AND an.company_id = ?
              AND av.turma_id = ? AND av.disciplina_id = ?
              AND av.bimestre = ? AND substr(av.data, 1, 4) = ?`,
      args: [alunoId, company_id, turma_id, disciplina_id, bimestre, ano],
    })
    const valores = []
    for (const row of r.rows) {
      const n = parseNotaAvaliacao(row.nota)
      if (n !== undefined && n !== null) valores.push(n)
    }
    const media = valores.length > 0
      ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100
      : null

    const existing = await db.execute({
      sql: 'SELECT id FROM notas WHERE aluno_id = ? AND disciplina_id = ? AND turma_id = ? AND bimestre = ? AND ano_letivo = ? AND company_id = ?',
      args: [alunoId, disciplina_id, turma_id, bimestre, ano, company_id],
    })
    if (existing.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE notas SET nota = ? WHERE id = ?',
        args: [media === null ? '' : formatNota(media), existing.rows[0].id],
      })
    } else if (media !== null) {
      await db.execute({
        sql: 'INSERT INTO notas (id, aluno_id, disciplina_id, turma_id, ano_letivo, bimestre, nota, faltas, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
        args: [crypto.randomUUID(), alunoId, disciplina_id, turma_id, ano, bimestre, formatNota(media), company_id],
      })
    }
  }
}

async function findAvaliacao(db, req, id) {
  const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
  const company_id = req.user.company_id || 'default'
  const r = await db.execute({
    sql: isSuper
      ? 'SELECT id, turma_id, disciplina_id, data, tipo, bimestre, company_id FROM avaliacoes WHERE id = ?'
      : 'SELECT id, turma_id, disciplina_id, data, tipo, bimestre, company_id FROM avaliacoes WHERE id = ? AND company_id = ?',
    args: isSuper ? [id] : [id, company_id],
  })
  if (r.rows.length === 0) return null
  const av = rowsToObjects(r.rows, r.columns)[0]
  return { av, company_id, isSuper }
}

// Escopo do professor: avaliações são sempre por disciplina alocada (sem "Geral").
async function checkScope(req, company_id, turma_id, disciplina_id) {
  const scope = professorScope(req)
  if (scope === null) return true
  if (!scope) return false
  return isTurmaDisciplinaInScope(req.db, scope, company_id, String(turma_id), String(disciplina_id))
}

// Opções de disciplina para agendar avaliação (mesma semântica do diário).
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

    const result = await req.db.execute({
      sql: `SELECT td.disciplina_id, d.nome, td.professor_id
            FROM turma_disciplinas td
            JOIN disciplinas d ON d.id = td.disciplina_id AND d.company_id = td.company_id
            WHERE td.turma_id = ?` + (isSuper ? '' : ' AND td.company_id = ?') + `
            ORDER BY d.nome`,
      args: isSuper ? [turma_id] : [turma_id, company_id],
    })
    let disciplinas = rowsToObjects(result.rows, result.columns)
    const scope = professorScope(req)
    if (scope !== null) {
      if (!scope) return res.status(403).json({ error: 'Forbidden: professor sem vínculo' })
      const inTurma = await isTurmaInScope(req.db, scope, company_id, turma_id)
      if (!inTurma) return res.status(403).json({ error: 'Forbidden: turma fora do seu escopo' })
      disciplinas = disciplinas.filter((d) => String(d.professor_id || '') === scope)
    }
    res.json({ disciplinas })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Avaliações do mês da turma (para o calendário), com contagem de notas lançadas.
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

    const avsResult = await req.db.execute({
      sql: `SELECT av.id, av.turma_id, av.disciplina_id, av.data, av.tipo, av.bimestre, av.descricao,
                   av.created_at, av.updated_at, d.nome AS disciplina_nome
            FROM avaliacoes av
            LEFT JOIN disciplinas d ON d.id = av.disciplina_id AND d.company_id = av.company_id
            WHERE av.turma_id = ? AND substr(av.data, 1, 7) = ?` + (isSuper ? '' : ' AND av.company_id = ?') + `
            ORDER BY av.data, d.nome`,
      args: isSuper ? [turma_id, mes] : [turma_id, mes, company_id],
    })
    const avaliacoes = rowsToObjects(avsResult.rows, avsResult.columns)

    const counts = await req.db.execute({
      sql: `SELECT an.avaliacao_id, COUNT(*) AS lancadas
            FROM avaliacao_notas an
            JOIN avaliacoes av ON av.id = an.avaliacao_id AND av.company_id = an.company_id
            WHERE av.turma_id = ? AND substr(av.data, 1, 7) = ? AND an.company_id = ? AND an.nota != ''
            GROUP BY an.avaliacao_id`,
      args: [turma_id, mes, company_id],
    })
    const lancadasMap = {}
    for (const row of counts.rows) lancadasMap[row.avaliacao_id] = Number(row.lancadas)

    const totalAlunos = await req.db.execute({
      sql: 'SELECT COUNT(*) AS n FROM aluno_turmas WHERE turma_id = ? AND company_id = ?',
      args: [turma_id, company_id],
    })

    for (const av of avaliacoes) {
      av.notas_lancadas = lancadasMap[av.id] || 0
    }
    res.json({ avaliacoes, total_alunos: Number(totalAlunos.rows[0].n) })
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Upsert do agendamento (turma + disciplina + data + tipo).
router.post('/', async (req, res) => {
  try {
    const { turma_id, disciplina_id, data, tipo, bimestre, descricao } = req.body
    if (!turma_id || !disciplina_id || !data || !tipo) {
      return res.status(400).json({ error: 'turma_id, disciplina_id, data and tipo required' })
    }
    if (!isValidDate(data)) return res.status(400).json({ error: 'data must be a valid YYYY-MM-DD date' })
    if (!TIPOS.includes(String(tipo))) return res.status(400).json({ error: `tipo must be one of: ${TIPOS.join(', ')}` })
    const bim = Number(bimestre)
    if (!Number.isInteger(bim) || bim < 1 || bim > 4) return res.status(400).json({ error: 'bimestre must be 1-4' })
    const isSuper = req.user.role === ROLES.SUPER_ADMIN && !req.headers['x-company-id']
    const company_id = req.user.company_id || 'default'

    const turma = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM turmas WHERE id = ?'
        : 'SELECT id FROM turmas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(turma_id)] : [String(turma_id), company_id],
    })
    if (turma.rows.length === 0) return res.status(404).json({ error: 'Turma not found' })

    const disc = await req.db.execute({
      sql: isSuper
        ? 'SELECT id FROM disciplinas WHERE id = ?'
        : 'SELECT id FROM disciplinas WHERE id = ? AND company_id = ?',
      args: isSuper ? [String(disciplina_id)] : [String(disciplina_id), company_id],
    })
    if (disc.rows.length === 0) return res.status(404).json({ error: 'Disciplina not found' })

    const scopeOk = await checkScope(req, company_id, String(turma_id), String(disciplina_id))
    if (!scopeOk) return res.status(403).json({ error: 'Forbidden: turma/disciplina fora do seu escopo' })

    const existing = await req.db.execute({
      sql: 'SELECT id, bimestre, data FROM avaliacoes WHERE turma_id = ? AND disciplina_id = ? AND data = ? AND tipo = ? AND company_id = ?',
      args: [String(turma_id), String(disciplina_id), String(data), String(tipo), company_id],
    })

    await req.db.execute('BEGIN')
    try {
      if (existing.rows.length > 0) {
        const avaliacaoId = existing.rows[0].id
        const oldBim = Number(existing.rows[0].bimestre)
        const oldAno = String(existing.rows[0].data).slice(0, 4)
        const newAno = String(data).slice(0, 4)
        await req.db.execute({
          sql: 'UPDATE avaliacoes SET bimestre = ?, descricao = ?, data = ?, updated_at = datetime(\'now\') WHERE id = ?',
          args: [bim, String(descricao || ''), String(data), avaliacaoId],
        })
        // Bimestre/ano mudaram: recompõem o antigo (limpa) e o novo.
        if (oldBim !== bim || oldAno !== newAno) {
          const comNotas = await req.db.execute({
            sql: 'SELECT DISTINCT aluno_id FROM avaliacao_notas WHERE avaliacao_id = ? AND company_id = ?',
            args: [avaliacaoId, company_id],
          })
          const alunoIds = comNotas.rows.map((r) => String(r.aluno_id))
          if (alunoIds.length > 0) {
            await recomporNotasBimestre(req.db, { turma_id: String(turma_id), disciplina_id: String(disciplina_id), bimestre: oldBim, ano: oldAno, company_id, alunoIds })
            await recomporNotasBimestre(req.db, { turma_id: String(turma_id), disciplina_id: String(disciplina_id), bimestre: bim, ano: newAno, company_id, alunoIds })
          }
        }
        await req.db.execute('COMMIT')
        res.json({ success: true, avaliacao_id: avaliacaoId })
      } else {
        const avaliacaoId = crypto.randomUUID()
        await req.db.execute({
          sql: `INSERT INTO avaliacoes (id, turma_id, disciplina_id, data, tipo, bimestre, descricao, company_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [avaliacaoId, String(turma_id), String(disciplina_id), String(data), String(tipo), bim, String(descricao || ''), company_id],
        })
        await req.db.execute('COMMIT')
        res.json({ success: true, avaliacao_id: avaliacaoId })
      }
    } catch (e) {
      await req.db.execute('ROLLBACK').catch(() => {})
      throw e
    }
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Alunos da turma + nota de cada um nesta avaliação (para o lançamento).
router.get('/:id/notas', async (req, res) => {
  try {
    const found = await findAvaliacao(req.db, req, req.params.id)
    if (!found) return res.status(404).json({ error: 'Avaliação not found' })
    const { av, company_id, isSuper } = found

    const scopeOk = await checkScope(req, company_id, av.turma_id, av.disciplina_id)
    if (!scopeOk) return res.status(403).json({ error: 'Forbidden: avaliação fora do seu escopo' })

    const result = await req.db.execute({
      sql: `SELECT a.id AS aluno_id, a.nome AS aluno_nome, an.id AS nota_id, an.nota
            FROM aluno_turmas at
            JOIN alunos a ON a.id = at.aluno_id
            LEFT JOIN avaliacao_notas an ON an.aluno_id = a.id AND an.avaliacao_id = ? AND an.company_id = ?
            WHERE at.turma_id = ?` + (isSuper ? '' : ' AND at.company_id = ?') + `
            ORDER BY a.nome`,
      args: isSuper ? [String(av.id), company_id, String(av.turma_id)] : [String(av.id), company_id, String(av.turma_id), company_id],
    })
    res.json(rowsToObjects(result.rows, result.columns))
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Lançar/editar as notas da avaliação (0-10, decimais, vírgula ok, vazio permitido)
// e recompor a média bimestral consolidada na tabela `notas`.
router.post('/:id/notas', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' })
    const found = await findAvaliacao(req.db, req, req.params.id)
    if (!found) return res.status(404).json({ error: 'Avaliação not found' })
    const { av, company_id } = found

    const scopeOk = await checkScope(req, company_id, av.turma_id, av.disciplina_id)
    if (!scopeOk) return res.status(403).json({ error: 'Forbidden: avaliação fora do seu escopo' })

    const alunoIds = items.map((i) => i.aluno_id).filter(Boolean)
    if (alunoIds.length > 0) {
      const pertence = await alunosBelongToTurma(req.db, String(av.turma_id), company_id, alunoIds)
      if (!pertence) return res.status(403).json({ error: 'Forbidden: aluno não pertence à turma' })
    }

    const valores = []
    for (const item of items) {
      if (!item.aluno_id) continue
      const n = parseNotaAvaliacao(item.nota)
      if (n === undefined) return res.status(400).json({ error: 'Nota inválida: use valores de 0 a 10 (decimais ok, vírgula permitida)' })
      valores.push({ aluno_id: item.aluno_id, nota: n })
    }

    await req.db.execute('BEGIN')
    try {
      let updated = 0
      for (const v of valores) {
        const existing = await req.db.execute({
          sql: 'SELECT id FROM avaliacao_notas WHERE avaliacao_id = ? AND aluno_id = ? AND company_id = ?',
          args: [String(av.id), v.aluno_id, company_id],
        })
        const notaStr = v.nota === null ? '' : formatNota(v.nota)
        if (existing.rows.length > 0) {
          await req.db.execute({
            sql: 'UPDATE avaliacao_notas SET nota = ?, updated_at = datetime(\'now\') WHERE id = ?',
            args: [notaStr, existing.rows[0].id],
          })
        } else {
          await req.db.execute({
            sql: 'INSERT INTO avaliacao_notas (id, avaliacao_id, aluno_id, nota, company_id) VALUES (?, ?, ?, ?, ?)',
            args: [crypto.randomUUID(), String(av.id), v.aluno_id, notaStr, company_id],
          })
        }
        updated++
      }
      const afetados = [...new Set(valores.map((v) => v.aluno_id))]
      await recomporNotasBimestre(req.db, {
        turma_id: String(av.turma_id),
        disciplina_id: String(av.disciplina_id),
        bimestre: Number(av.bimestre),
        ano: String(av.data).slice(0, 4),
        company_id,
        alunoIds: afetados,
      })
      await req.db.execute('COMMIT')
      res.json({ success: true, updated, recompostos: afetados.length })
    } catch (e) {
      await req.db.execute('ROLLBACK').catch(() => {})
      throw e
    }
  } catch (err) {
    console.error(`[api 500] ${res.req.method} ${res.req.originalUrl}`, err)
    res.status(500).json({ error: String(err) })
  }
})

// Excluir avaliação: remove agendamento + notas lançadas e recompõe a média
// bimestral (que volta a considerar apenas as avaliações restantes).
router.delete('/:id', async (req, res) => {
  try {
    const found = await findAvaliacao(req.db, req, req.params.id)
    if (!found) return res.status(404).json({ error: 'Avaliação not found' })
    const { av, company_id } = found

    const scopeOk = await checkScope(req, company_id, av.turma_id, av.disciplina_id)
    if (!scopeOk) return res.status(403).json({ error: 'Forbidden: avaliação fora do seu escopo' })

    await req.db.execute('BEGIN')
    try {
      const comNotas = await req.db.execute({
        sql: 'SELECT DISTINCT aluno_id FROM avaliacao_notas WHERE avaliacao_id = ? AND company_id = ?',
        args: [String(av.id), company_id],
      })
      const alunoIds = comNotas.rows.map((r) => String(r.aluno_id))

      await req.db.execute({
        sql: 'DELETE FROM avaliacao_notas WHERE avaliacao_id = ? AND company_id = ?',
        args: [String(av.id), company_id],
      })
      await req.db.execute({
        sql: 'DELETE FROM avaliacoes WHERE id = ? AND company_id = ?',
        args: [String(av.id), company_id],
      })

      if (alunoIds.length > 0) {
        await recomporNotasBimestre(req.db, {
          turma_id: String(av.turma_id),
          disciplina_id: String(av.disciplina_id),
          bimestre: Number(av.bimestre),
          ano: String(av.data).slice(0, 4),
          company_id,
          alunoIds,
        })
      }
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
