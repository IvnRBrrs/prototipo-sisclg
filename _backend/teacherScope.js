import { ROLES } from './roles.js'

// Escopo de um professor: turmas em que ele é responsável OU onde leciona
// (turma_disciplinas.professor_id), as disciplinas alocadas a ele e os alunos
// dessas turmas. Um professor com login sem vínculo (professor_id vazio)
// não enxerga nada.

// Retorna o professor_id do usuário autenticado quando ele é professor:
//   - null → não é professor (sem escopo aplicável)
//   - ''   → professor sem vínculo (negar acesso em todas as rotas escopadas)
//   - id   → professor com vínculo (usar nas checagens de escopo)
export function professorScope(req) {
  if (req.user?.role !== ROLES.PROFESSOR) return null
  return String(req.user?.professor_id || '')
}

export async function isTurmaInScope(db, professorId, companyId, turmaId) {
  const r = await db.execute({
    sql: `SELECT 1 FROM turmas
          WHERE id = ? AND company_id = ?
            AND (professor_responsavel_id = ? OR id IN (SELECT turma_id FROM turma_disciplinas WHERE professor_id = ? AND company_id = ?))
          LIMIT 1`,
    args: [String(turmaId), companyId, professorId, professorId, companyId],
  })
  return r.rows.length > 0
}

export async function isTurmaDisciplinaInScope(db, professorId, companyId, turmaId, disciplinaId) {
  const r = await db.execute({
    sql: 'SELECT 1 FROM turma_disciplinas WHERE turma_id = ? AND disciplina_id = ? AND professor_id = ? AND company_id = ? LIMIT 1',
    args: [String(turmaId), String(disciplinaId), professorId, companyId],
  })
  return r.rows.length > 0
}

export async function isAlunoInScope(db, professorId, companyId, alunoId) {
  const r = await db.execute({
    sql: `SELECT 1 FROM aluno_turmas at
          JOIN turmas t ON t.id = at.turma_id
          WHERE at.aluno_id = ? AND at.company_id = ?
            AND (t.professor_responsavel_id = ? OR t.id IN (SELECT turma_id FROM turma_disciplinas WHERE professor_id = ? AND company_id = ?))
          LIMIT 1`,
    args: [String(alunoId), companyId, professorId, professorId, companyId],
  })
  return r.rows.length > 0
}

// Verifica que todos os aluno_ids pertencem à turma informada.
export async function alunosBelongToTurma(db, turmaId, companyId, alunoIds) {
  const ids = [...new Set(alunoIds.filter(Boolean).map(String))]
  if (ids.length === 0) return true
  const placeholders = ids.map(() => '?').join(', ')
  const r = await db.execute({
    sql: `SELECT aluno_id FROM aluno_turmas WHERE turma_id = ? AND company_id = ? AND aluno_id IN (${placeholders})`,
    args: [String(turmaId), companyId, ...ids],
  })
  const valid = new Set(r.rows.map((row) => String(row.aluno_id)))
  return ids.every((id) => valid.has(id))
}
