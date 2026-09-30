import { useState, useEffect } from 'react'
import api from '../cms/api'
import { getRoleFromToken, ROLES } from '../cms/auth'

interface Turma {
  id: string
  nome: string
  serie: string
  periodo: string
  ano_letivo: string
}

interface TurmaDisciplina {
  turma_disciplina_id: string
  disciplina_id: string
  disciplina_nome: string
  abreviatura: string
  professor_id: string
  professor_nome: string
}

interface Aula {
  id: string
  turma_disciplina_id: string
  turma_id: string
  disciplina_id: string
  disciplina_nome: string
  abreviatura: string
  professor_id: string
  professor_nome: string
  periodo: string
  dia_semana: number
  aula_num: number
  ano_letivo: string
  turma_nome: string
  turma_serie: string
  turma_periodo: string
}

const DIAS = [
  { num: 1, nome: 'Segunda' },
  { num: 2, nome: 'Terça' },
  { num: 3, nome: 'Quarta' },
  { num: 4, nome: 'Quinta' },
  { num: 5, nome: 'Sexta' },
]
const AULAS = [1, 2, 3, 4, 5, 6]

export default function GradeHorariaManager() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [turma, setTurma] = useState<Turma | null>(null)
  const [disciplinas, setDisciplinas] = useState<TurmaDisciplina[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [allAulas, setAllAulas] = useState<Aula[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ dia: number; aula: number } | null>(null)
  const [novaTdId, setNovaTdId] = useState('')
  const [salvando, setSalvando] = useState(false)

  const role = getRoleFromToken()
  const canManage = role === ROLES.SUPER_ADMIN || role === ROLES.GESTOR_ADMIN

  const loadTurmas = async () => {
    setError('')
    try {
      const { data } = await api.get('/turmas/select')
      setTurmas(data)
      if (data.length > 0) {
        setTurmaId(data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar turmas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTurmas() }, [])

  useEffect(() => {
    if (!turmaId) { setTurma(null); setDisciplinas([]); setAulas([]); setAllAulas([]); return }
    setError('')
    const t = turmas.find((x) => x.id === turmaId) || null
    setTurma(t)
    Promise.all([
      api.get(`/turmas/${turmaId}/disciplinas`),
      api.get(`/horarios?turma_id=${turmaId}`),
      api.get('/horarios'),
    ])
      .then(([disc, grade, todas]) => {
        setDisciplinas(disc.data)
        setAulas(grade.data)
        setAllAulas(todas.data)
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Erro ao carregar grade'))
  }, [turmaId])

  const slotKey = (a: { periodo: string; dia_semana: number; aula_num: number; professor_id: string }) =>
    `${a.periodo}|${a.dia_semana}|${a.aula_num}|${a.professor_id}`

  // Conflito do professor desta aula em OUTRA turma, no mesmo horário do período
  const hasProfessorConflict = (aula: Aula) => {
    const key = slotKey(aula)
    return allAulas.some((x) => slotKey(x) === key && x.id !== aula.id)
  }

  const aulaAt = (dia: number, num: number) => aulas.find((a) => a.dia_semana === dia && a.aula_num === num)

  const openModal = (dia: number, aula: number) => {
    setNovaTdId('')
    setModal({ dia, aula })
  }

  const candidateConflict = () => {
    if (!modal || !novaTdId) return null
    const td = disciplinas.find((d) => d.turma_disciplina_id === novaTdId)
    if (!td) return null
    if (!td.professor_id) return { td, message: 'Este vínculo não possui professor definido.' }
    const key = `${turma?.periodo || ''}|${modal.dia}|${modal.aula}|${td.professor_id}`
    const busy = allAulas.find((x) => slotKey(x) === key)
    if (busy) return { td, message: `Conflito: este professor já ministra aula na turma "${busy.turma_nome}" nesse horário.` }
    return null
  }

  const salvarAula = async () => {
    if (!modal || !novaTdId) return
    setSalvando(true)
    setError('')
    try {
      await api.post('/horarios', {
        turma_disciplina_id: novaTdId,
        dia_semana: modal.dia,
        aula_num: modal.aula,
        ano_letivo: turma?.ano_letivo || '',
      })
      setModal(null)
      setNovaTdId('')
      const [grade, todas] = await Promise.all([api.get(`/horarios?turma_id=${turmaId}`), api.get('/horarios')])
      setAulas(grade.data)
      setAllAulas(todas.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao marcar aula')
    } finally {
      setSalvando(false)
    }
  }

  const removerAula = async (aula: Aula) => {
    if (!confirm(`Remover "${aula.disciplina_nome}" (${aula.professor_nome || 'sem professor'}) da ${DIAS[aula.dia_semana - 1]?.nome}, ${aula.aula_num}ª aula?`)) return
    setError('')
    try {
      await api.delete(`/horarios/${aula.id}`)
      setAulas((prev) => prev.filter((a) => a.id !== aula.id))
      setAllAulas((prev) => prev.filter((a) => a.id !== aula.id))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao remover aula')
    }
  }

  const conflict = candidateConflict()

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Grade Horária</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Aulas de 50 min · até 6 aulas/dia · Segunda a Sexta
            {!canManage && ' · visualização somente leitura'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', minWidth: 260 }}>
          <div className="admin-field">
            <label>Turma</label>
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Selecione a turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.serie ? ` — ${t.serie}` : ''}{t.periodo ? ` (${t.periodo})` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && !turmaId && turmas.length === 0 && (
        <p className="admin-empty">Nenhuma turma disponível.</p>
      )}

      {!loading && turma && (
        <>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>
            <strong>{turma.nome}</strong>
            {turma.serie && ` · ${turma.serie}`}
            {turma.periodo && ` · Período ${turma.periodo}`}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Aula</th>
                  {DIAS.map((d) => <th key={d.num}>{d.nome}</th>)}
                </tr>
              </thead>
              <tbody>
                {AULAS.map((num) => (
                  <tr key={num}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{num}ª</td>
                    {DIAS.map((d) => {
                      const aula = aulaAt(d.num, num)
                      const conflito = aula ? hasProfessorConflict(aula) : false
                      return (
                        <td key={d.num} style={{ padding: 4 }}>
                          {aula ? (
                            <div
                              style={{
                                border: `1px solid ${conflito ? 'var(--danger, #dc2626)' : 'var(--border)'}`,
                                borderRadius: 6,
                                padding: '6px 8px',
                                minHeight: 56,
                                background: conflito ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.06)',
                                cursor: canManage ? 'pointer' : 'default',
                                position: 'relative',
                              }}
                              title={conflito ? 'Conflito: o professor ministra aula em outra turma neste horário' : (canManage ? 'Clique para remover' : undefined)}
                              onClick={() => canManage && removerAula(aula)}
                            >
                              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{aula.abreviatura || aula.disciplina_nome}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 }}>
                                {aula.professor_nome || '—'}
                              </div>
                              {conflito && (
                                <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--danger, #dc2626)', color: '#fff', borderRadius: 10, fontSize: '0.65rem', padding: '1px 6px' }}>
                                  Conflito
                                </div>
                              )}
                            </div>
                          ) : (
                            canManage && (
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ width: '100%', minHeight: 56, opacity: 0.5 }}
                                onClick={() => openModal(d.num, num)}
                              >
                                + Adicionar
                              </button>
                            )
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-light)' }}>
            Os slots disponíveis são os vínculos existentes de disciplina + professor da turma (Cadastros → Turmas → Detalhes).
            Um professor pode lecionar 1 ou mais aulas na mesma turma, em dias e horários diferentes.
          </p>
        </>
      )}

      {modal && turma && (
        <div className="admin-modal-overlay" onClick={() => setModal(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="admin-modal-close" onClick={() => setModal(null)}>&times;</button>
            <h3>Marcar aula</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 0 }}>
              {turma.nome} · {DIAS[modal.dia - 1]?.nome} · {modal.aula}ª aula
              {turma.periodo ? ` · ${turma.periodo}` : ''}
            </p>
            <div className="admin-field">
              <label>Disciplina / Professor</label>
              <select value={novaTdId} onChange={(e) => setNovaTdId(e.target.value)}>
                <option value="">Selecione um vínculo da turma</option>
                {disciplinas.map((d) => (
                  <option key={d.turma_disciplina_id} value={d.turma_disciplina_id}>
                    {d.disciplina_nome}{d.professor_nome ? ` — ${d.professor_nome}` : ' (sem professor)'}
                  </option>
                ))}
              </select>
            </div>
            {conflict && (
              <p style={{ color: 'var(--danger, #dc2626)', fontSize: '0.85rem' }}>{conflict.message}</p>
            )}
            {novaTdId && !conflict && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                {disciplinas.find((d) => d.turma_disciplina_id === novaTdId)?.professor_nome
                  ? `Professor: ${disciplinas.find((d) => d.turma_disciplina_id === novaTdId)?.professor_nome}`
                  : 'Vínculo sem professor — defina o professor na turma antes.'}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={salvarAula}
                disabled={!novaTdId || !!conflict || salvando}
              >
                {salvando ? 'Salvando...' : 'Marcar'}
              </button>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
