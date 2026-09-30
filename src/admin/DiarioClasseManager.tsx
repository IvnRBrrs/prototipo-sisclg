import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Turma {
  id: string
  nome: string
  serie: string
  periodo: string
  ano_letivo: string
}

interface DisciplinaOpt {
  disciplina_id: string
  nome: string
}

interface Aula {
  id: string
  turma_id: string
  disciplina_id: string
  data: string
  conteudo: string
  observacoes: string
  professor_id: string
  created_at: string
  updated_at: string
  disciplina_nome: string | null
  presentes: number
  ausentes: number
  justificados: number
}

interface AlunoChamada {
  aluno_id: string
  aluno_nome: string
  frequencia_id: string | null
  status: string | null
}

interface Resumo {
  aluno_nome: string
  total_chamadas: number
  presencas: number
  ausencias: number
  justificadas: number
  percentual_presenca: number | null
}

interface Avaliacao {
  id: string
  turma_id: string
  disciplina_id: string
  data: string
  tipo: string
  bimestre: number
  descricao: string
  created_at: string
  updated_at: string
  disciplina_nome: string | null
  notas_lancadas: number
}

interface NotaAvaliacao {
  aluno_id: string
  aluno_nome: string
  nota_id: string | null
  nota: string
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const STATUS_LABEL: Record<string, string> = { presente: 'Presente', ausente: 'Ausente', justificado: 'Justificado' }
const TIPOS_AVALIACAO: { value: string; label: string }[] = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trabalho1', label: 'Trabalho 1' },
  { value: 'trabalho2', label: 'Trabalho 2' },
  { value: 'trabalho3', label: 'Trabalho 3' },
]
const tipoLabel = (t: string) => TIPOS_AVALIACAO.find((x) => x.value === t)?.label || t
// Sugestão de bimestre pela data: meses 1-3→1º, 4-6→2º, 7-9→3º, 10-12→4º
const bimestreSugerido = (dataISO: string) => {
  const mes = Number((dataISO || '').slice(5, 7))
  if (mes >= 1 && mes <= 3) return 1
  if (mes >= 4 && mes <= 6) return 2
  if (mes >= 7 && mes <= 9) return 3
  return 4
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const dayStr = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`
const localToday = () => {
  const d = new Date()
  return dayStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function freqClass(percentual: number | null) {
  if (percentual === null || percentual === undefined) return ''
  return percentual <= 75 ? 'diario-freq-baixa' : 'diario-freq-ok'
}

export default function DiarioClasseManager() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [aulas, setAulas] = useState<Aula[]>([])
  const [aulasByDay, setAulasByDay] = useState<Record<string, Aula[]>>({})
  const [avaliacoesByDay, setAvaliacoesByDay] = useState<Record<string, Avaliacao[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal do dia
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [disciplinaOpts, setDisciplinaOpts] = useState<DisciplinaOpt[]>([])

  // Modo do modal: 'list' (dia), 'form' (aula), 'avaliacaoForm' (agendar), 'notasForm' (lançar notas)
  const [modalMode, setModalMode] = useState<'list' | 'form' | 'avaliacaoForm' | 'notasForm'>('list')
  const [editingAula, setEditingAula] = useState<Aula | null>(null)
  const [formDisciplina, setFormDisciplina] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [chamada, setChamada] = useState<AlunoChamada[]>([])

  // Avaliações (agendamento + lançamento de notas)
  const [avDisciplinaOpts, setAvDisciplinaOpts] = useState<DisciplinaOpt[]>([])
  const [editingAvaliacao, setEditingAvaliacao] = useState<Avaliacao | null>(null)
  const [avFormDisciplina, setAvFormDisciplina] = useState('')
  const [avFormTipo, setAvFormTipo] = useState('mensal')
  const [avFormBimestre, setAvFormBimestre] = useState(1)
  const [avFormDescricao, setAvFormDescricao] = useState('')
  const [notasAvaliacao, setNotasAvaliacao] = useState<Avaliacao | null>(null)
  const [notasItems, setNotasItems] = useState<NotaAvaliacao[]>([])
  const [confirmDeleteAv, setConfirmDeleteAv] = useState<Avaliacao | null>(null)

  // Resumo por aluno (expande ao clicar no nome)
  const [openAluno, setOpenAluno] = useState<string | null>(null)
  const [resumos, setResumos] = useState<Record<string, Resumo>>({})
  const [confirmDelete, setConfirmDelete] = useState<Aula | null>(null)

  const mesStr = `${cursor.y}-${pad2(cursor.m + 1)}`
  const today = localToday()

  useEffect(() => {
    api.get('/turmas/select')
      .then((resp) => { setTurmas(resp.data) })
      .catch((err: any) => { setError(err.response?.data?.error || 'Erro ao carregar turmas') })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (turmas.length > 0 && !turmaId) setTurmaId(turmas[0].id)
  }, [turmas])

  const loadMonth = async () => {
    if (!turmaId) { setAulas([]); setAulasByDay({}); setAvaliacoesByDay({}); return }
    setError('')
    try {
      const [aulasResp, avsResp] = await Promise.all([
        api.get('/aulas', { params: { turma_id: turmaId, mes: mesStr } }),
        api.get('/avaliacoes', { params: { turma_id: turmaId, mes: mesStr } }),
      ])
      const list: Aula[] = aulasResp.data.aulas || []
      setAulas(list)
      const byDay: Record<string, Aula[]> = {}
      for (const a of list) {
        if (!byDay[a.data]) byDay[a.data] = []
        byDay[a.data].push(a)
      }
      setAulasByDay(byDay)
      const avs: Avaliacao[] = avsResp.data.avaliacoes || []
      const avsByDay: Record<string, Avaliacao[]> = {}
      for (const av of avs) {
        if (!avsByDay[av.data]) avsByDay[av.data] = []
        avsByDay[av.data].push(av)
      }
      setAvaliacoesByDay(avsByDay)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar o mês')
    }
  }

  useEffect(() => { loadMonth() }, [turmaId, mesStr])

  const loadDisciplinaOpts = async () => {
    try {
      const resp = await api.get('/aulas/disciplinas', { params: { turma_id: turmaId } })
      setDisciplinaOpts(resp.data.disciplinas || [])
    } catch {
      setDisciplinaOpts([])
    }
  }

  const loadChamada = async (disciplinaId: string, data: string) => {
    try {
      const resp = await api.get('/frequencia', { params: { turma_id: turmaId, disciplina_id: disciplinaId, data } })
      const rows: AlunoChamada[] = (resp.data || []).map((r: any) => ({
        aluno_id: r.aluno_id,
        aluno_nome: r.aluno_nome,
        frequencia_id: r.frequencia_id,
        status: r.status || 'presente',
      }))
      setChamada(rows)
    } catch (err: any) {
      setChamada([])
      setError(err.response?.data?.error || 'Erro ao carregar alunos da turma')
    }
  }

  const loadResumo = async (alunoId: string) => {
    try {
      const resp = await api.get(`/frequencia/resumo/${alunoId}`, { params: { turma_id: turmaId } })
      setResumos((prev) => ({ ...prev, [alunoId]: resp.data }))
    } catch {
      setResumos((prev) => ({ ...prev, [alunoId]: { aluno_nome: '', total_chamadas: 0, presencas: 0, ausencias: 0, justificadas: 0, percentual_presenca: null } }))
    }
  }

  const openDay = async (date: string) => {
    setSelectedDay(date)
    setModalMode('list')
    setEditingAula(null)
    setStatusMsg('')
    setOpenAluno(null)
    await Promise.all([loadDisciplinaOpts(), loadAvDisciplinaOpts()])
  }

  const loadAvDisciplinaOpts = async () => {
    try {
      const resp = await api.get('/avaliacoes/disciplinas', { params: { turma_id: turmaId } })
      setAvDisciplinaOpts(resp.data.disciplinas || [])
    } catch {
      setAvDisciplinaOpts([])
    }
  }

  const startRegister = async () => {
    if (!selectedDay) return
    setEditingAula(null)
    setModalMode('form')
    setFormDisciplina('')
    setFormConteudo('')
    setFormObservacoes('')
    setOpenAluno(null)
    await loadChamada('', selectedDay)
  }

  const startEdit = async (aula: Aula) => {
    setEditingAula(aula)
    setModalMode('form')
    setFormDisciplina(aula.disciplina_id || '')
    setFormConteudo(aula.conteudo || '')
    setFormObservacoes(aula.observacoes || '')
    setOpenAluno(null)
    await loadChamada(aula.disciplina_id || '', aula.data)
  }

  const changeFormDisciplina = async (disciplinaId: string) => {
    setFormDisciplina(disciplinaId)
    if (selectedDay) await loadChamada(disciplinaId, selectedDay)
  }

  const setStatus = (alunoId: string, status: string) => {
    setChamada((prev) => prev.map((c) => (c.aluno_id === alunoId ? { ...c, status } : c)))
  }

  const toggleAluno = (alunoId: string) => {
    if (openAluno === alunoId) {
      setOpenAluno(null)
      return
    }
    setOpenAluno(alunoId)
    if (!resumos[alunoId]) loadResumo(alunoId)
  }

  const saveAula = async () => {
    if (!selectedDay) return
    setSaving(true)
    setStatusMsg('')
    try {
      const resp = await api.post('/aulas', {
        turma_id: turmaId,
        disciplina_id: formDisciplina,
        data: selectedDay,
        conteudo: formConteudo,
        observacoes: formObservacoes,
        chamada: chamada.map((c) => ({ aluno_id: c.aluno_id, status: c.status })),
      })
      setStatusMsg(`Aula salva — ${resp.data.chamada_updated} alunos registrados.`)
      setModalMode('list')
      setResumos({})
      setOpenAluno(null)
      await loadMonth()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar aula')
    } finally {
      setSaving(false)
    }
  }

  const deleteAula = async () => {
    if (!confirmDelete) return
    setStatusMsg('')
    try {
      await api.delete(`/aulas/${confirmDelete.id}`)
      setConfirmDelete(null)
      setModalMode('list')
      setEditingAula(null)
      setStatusMsg('Aula excluída (junto com a chamada do dia).')
      setResumos({})
      await loadMonth()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao excluir aula')
      setConfirmDelete(null)
    }
  }

  const prevMonth = () => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))
  const nextMonth = () => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))
  const goToday = () => {
    const d = new Date()
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  // ===== Avaliações =====

  const startAgendarAvaliacao = () => {
    if (!selectedDay) return
    setEditingAvaliacao(null)
    setModalMode('avaliacaoForm')
    setAvFormDisciplina(avDisciplinaOpts.length > 0 ? avDisciplinaOpts[0].disciplina_id : '')
    setAvFormTipo('mensal')
    setAvFormBimestre(bimestreSugerido(selectedDay))
    setAvFormDescricao('')
  }

  const startEditarAvaliacao = (av: Avaliacao) => {
    setEditingAvaliacao(av)
    setModalMode('avaliacaoForm')
    setAvFormDisciplina(av.disciplina_id)
    setAvFormTipo(av.tipo)
    setAvFormBimestre(Number(av.bimestre) || 1)
    setAvFormDescricao(av.descricao || '')
  }

  const salvarAvaliacao = async () => {
    if (!selectedDay) return
    setSaving(true)
    setStatusMsg('')
    try {
      await api.post('/avaliacoes', {
        turma_id: turmaId,
        disciplina_id: avFormDisciplina,
        data: selectedDay,
        tipo: avFormTipo,
        bimestre: avFormBimestre,
        descricao: avFormDescricao,
      })
      setStatusMsg(editingAvaliacao ? 'Avaliação atualizada.' : 'Avaliação agendada.')
      setModalMode('list')
      setEditingAvaliacao(null)
      await loadMonth()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar avaliação')
    } finally {
      setSaving(false)
    }
  }

  const startLancarNotas = async (av: Avaliacao) => {
    setStatusMsg('')
    try {
      const resp = await api.get(`/avaliacoes/${av.id}/notas`)
      setNotasItems((resp.data || []).map((r: any) => ({
        aluno_id: r.aluno_id,
        aluno_nome: r.aluno_nome,
        nota_id: r.nota_id,
        nota: r.nota || '',
      })))
      setNotasAvaliacao(av)
      setModalMode('notasForm')
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao carregar notas')
    }
  }

  const setNotaItem = (alunoId: string, nota: string) => {
    setNotasItems((prev) => prev.map((n) => (n.aluno_id === alunoId ? { ...n, nota } : n)))
  }

  const salvarNotas = async () => {
    if (!notasAvaliacao) return
    setSaving(true)
    setStatusMsg('')
    try {
      const resp = await api.post(`/avaliacoes/${notasAvaliacao.id}/notas`, {
        items: notasItems.map((n) => ({ aluno_id: n.aluno_id, nota: n.nota })),
      })
      setStatusMsg(`Notas salvas — ${resp.data.updated} alunos (média bimestral recomposta).`)
      setModalMode('list')
      setNotasAvaliacao(null)
      await loadMonth()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar notas')
    } finally {
      setSaving(false)
    }
  }

  const deleteAvaliacao = async () => {
    if (!confirmDeleteAv) return
    setStatusMsg('')
    try {
      await api.delete(`/avaliacoes/${confirmDeleteAv.id}`)
      setConfirmDeleteAv(null)
      setModalMode('list')
      setStatusMsg('Avaliação excluída (notas removidas e média bimestral recomposta).')
      await loadMonth()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao excluir avaliação')
      setConfirmDeleteAv(null)
    }
  }

  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay()
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayAulas = selectedDay ? (aulasByDay[selectedDay] || []) : []
  const dayAvaliacoes = selectedDay ? (avaliacoesByDay[selectedDay] || []) : []
  const resumoAluno = (alunoId: string): Resumo | null => resumos[alunoId] || null

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Diário de Classe</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Registro diário das aulas: conteúdo dado, chamada e frequência dos alunos
          </p>
        </div>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <>
          {turmas.length === 0 && (
            <p className="admin-empty">Nenhuma turma designada para você.</p>
          )}

          {turmas.length > 0 && (
            <>
              <div className="diario-toolbar">
                <div className="admin-field" style={{ minWidth: 240 }}>
                  <label>Turma</label>
                  <select value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setSelectedDay(null) }}>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}{t.serie ? ` · ${t.serie}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="diario-month-nav">
                  <button className="btn btn-outline" onClick={prevMonth} aria-label="Mês anterior">◀</button>
                  <span className="diario-month-label">{MESES[cursor.m]} {cursor.y}</span>
                  <button className="btn btn-outline" onClick={nextMonth} aria-label="Próximo mês">▶</button>
                  <button className="btn btn-outline" onClick={goToday}>Hoje</button>
                </div>
              </div>

              <div className="diario-calendar">
                <div className="diario-grid">
                  {DIAS_SEMANA.map((d) => (
                    <div key={d} className="diario-weekday">{d}</div>
                  ))}
                  {cells.map((d, idx) => {
                    if (d === null) return <div key={`empty-${idx}`} className="diario-day diario-empty-day" />
                    const ds = dayStr(cursor.y, cursor.m, d)
                    const dayAulaList = aulasByDay[ds] || []
                    const dayAvList = avaliacoesByDay[ds] || []
                    const totalFaltas = dayAulaList.reduce((sum, a) => sum + (a.ausentes || 0), 0)
                    return (
                      <div
                        key={ds}
                        className={`diario-day${dayAulaList.length > 0 ? ' has-aula' : ''}${dayAvList.length > 0 ? ' has-avaliacao' : ''}${ds === today ? ' today' : ''}`}
                        onClick={() => openDay(ds)}
                        title={dayAvList.length > 0 ? `${dayAvList.length} avaliação(ões) agendada(s)` : dayAulaList.length > 0 ? `${dayAulaList.length} aula(s) registrada(s)` : 'Registrar aula ou avaliação'}
                      >
                        <span className="diario-day-num">{d}</span>
                        {dayAvList.length > 0 && (
                          <div className="diario-day-badges">
                            <span className="diario-day-badge avaliacoes">📝 {dayAvList.length} avaliação{dayAvList.length > 1 ? 'ões' : ''}</span>
                          </div>
                        )}
                        {dayAulaList.length > 0 && (
                          <div className="diario-day-badges">
                            <span className="diario-day-badge aulas">{dayAulaList.length} aula{dayAulaList.length > 1 ? 's' : ''}</span>
                            {totalFaltas > 0 && <span className="diario-day-badge faltas">{totalFaltas} falta{totalFaltas > 1 ? 's' : ''}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Clique em um dia para registrar a aula, ver a chamada ou editar registros anteriores.
              </p>
            </>
          )}
        </>
      )}

      {selectedDay && modalMode === 'list' && (
        <div className="admin-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <button className="admin-modal-close" onClick={() => setSelectedDay(null)}>&times;</button>
            <h3>Diário — {selectedDay.split('-').reverse().join('/')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {dayAulas.length === 0 && (
                <p className="admin-empty">Nenhuma aula registrada neste dia.</p>
              )}
              {dayAulas.map((a) => (
                <div key={a.id} className="diario-aula-card">
                  <div className="diario-aula-head">
                    <strong>{a.disciplina_nome || 'Geral (dia letivo)'}</strong>
                    <span className="diario-aula-counts">
                      ✅ {a.presentes} · ❌ {a.ausentes}{a.justificados > 0 ? ` · 📝 ${a.justificados}` : ''}
                    </span>
                  </div>
                  {a.conteudo && <p className="diario-aula-conteudo">{a.conteudo}</p>}
                  {a.observacoes && <p className="diario-aula-obs">Obs.: {a.observacoes}</p>}
                  <div className="diario-aula-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => startEdit(a)}>Abrir / Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(a)}>Excluir Aula</button>
                  </div>
                </div>
              ))}

              {dayAvaliacoes.length > 0 && (
                <div className="diario-avaliacoes-section">
                  <strong style={{ fontSize: '0.9rem' }}>Avaliações do dia</strong>
                  {dayAvaliacoes.map((av) => (
                    <div key={av.id} className="diario-avaliacao-card">
                      <div className="diario-aula-head">
                        <strong className="diario-avaliacao-titulo">📝 {tipoLabel(av.tipo)} — {av.disciplina_nome || ''}</strong>
                        <span className="diario-aula-counts">
                          {av.bimestre}º bim · {av.notas_lancadas} nota{av.notas_lancadas === 1 ? '' : 's'} lançada{av.notas_lancadas === 1 ? '' : 's'}
                        </span>
                      </div>
                      {av.descricao && <p className="diario-aula-obs">{av.descricao}</p>}
                      <div className="diario-aula-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => startLancarNotas(av)}>
                          {av.notas_lancadas > 0 ? 'Editar Notas' : 'Lançar Notas'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => startEditarAvaliacao(av)}>Editar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteAv(av)}>Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={startRegister}>+ Registrar Aula</button>
                <button className="btn btn-outline" onClick={startAgendarAvaliacao}>📝 Agendar Avaliação</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDay && modalMode === 'form' && (
        <div className="admin-modal-overlay" onClick={() => setModalMode('list')}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <button className="admin-modal-close" onClick={() => setModalMode('list')}>&times;</button>
            <h3>{editingAula ? 'Editar Aula' : 'Registrar Aula'} — {selectedDay.split('-').reverse().join('/')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div className="admin-field">
                <label>Disciplina</label>
                <select
                  value={formDisciplina}
                  onChange={(e) => changeFormDisciplina(e.target.value)}
                  disabled={!!editingAula}
                >
                  <option value="">Geral (dia letivo)</option>
                  {disciplinaOpts.map((d) => (
                    <option key={d.disciplina_id} value={d.disciplina_id}>{d.nome}</option>
                  ))}
                </select>
                {editingAula && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    A aula registrada: <strong>{editingAula.disciplina_nome || 'Geral (dia letivo)'}</strong>
                  </p>
                )}
              </div>
              <div className="admin-field">
                <label>Conteúdo dado na aula</label>
                <textarea
                  rows={3}
                  value={formConteudo}
                  onChange={(e) => setFormConteudo(e.target.value)}
                  placeholder="O que foi trabalhado na aula de hoje..."
                />
              </div>
              <div className="admin-field">
                <label>Observações</label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Opcional: observações sobre a aula, tarefas, avisos..."
                />
              </div>

              <div>
                <strong style={{ fontSize: '0.9rem' }}>Chamada ({chamada.length} alunos)</strong>
                <p style={{ margin: '2px 0 8px', fontSize: '0.78rem', color: 'var(--text-light)' }}>
                  Todos iniciam como Presente — clique para marcar Falta ou Justificado. Clique no nome do aluno para ver a frequência dele.
                </p>
                <div className="diario-chamada-list">
                  {chamada.length === 0 && <p className="admin-empty">Nenhum aluno enturmado nesta turma.</p>}
                  {chamada.map((c) => {
                    const status = c.status || 'presente'
                    const r = resumoAluno(c.aluno_id)
                    return (
                      <div key={c.aluno_id} className="diario-chamada-item">
                        <div className="diario-chamada-row">
                          <button
                            type="button"
                            className={`diario-aluno-nome${openAluno === c.aluno_id ? ' open' : ''}`}
                            onClick={() => toggleAluno(c.aluno_id)}
                          >
                            {c.aluno_nome}
                          </button>
                          <div className="diario-chips">
                            <button
                              type="button"
                              className={`diario-chip presente${status === 'presente' ? ' active' : ''}`}
                              onClick={() => setStatus(c.aluno_id, 'presente')}
                            >Presença</button>
                            <button
                              type="button"
                              className={`diario-chip ausente${status === 'ausente' ? ' active' : ''}`}
                              onClick={() => setStatus(c.aluno_id, 'ausente')}
                            >Falta</button>
                            <button
                              type="button"
                              className={`diario-chip justificado${status === 'justificado' ? ' active' : ''}`}
                              onClick={() => setStatus(c.aluno_id, 'justificado')}
                            >Justificado</button>
                          </div>
                        </div>
                        {openAluno === c.aluno_id && (
                          <div className="diario-resumo">
                            {r ? (
                              r.total_chamadas > 0 ? (
                                <>
                                  <span className={`diario-freq-big ${freqClass(r.percentual_presenca)}`}>
                                    {r.percentual_presenca}% frequência
                                  </span>
                                  <span className="diario-freq-detail">
                                    {r.total_chamadas} aulas · ✅ {r.presencas} · ❌ {r.ausencias} · 📝 {r.justificadas}
                                  </span>
                                </>
                              ) : (
                                <span className="diario-freq-detail">Nenhuma chamada registrada ainda.</span>
                              )
                            ) : (
                              <span className="diario-freq-detail">Carregando frequência...</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={saveAula} disabled={saving || chamada.length === 0}>
                  {saving ? 'Salvando...' : editingAula ? 'Salvar Alterações' : 'Registrar Aula e Chamada'}
                </button>
                <button className="btn btn-outline" onClick={() => setModalMode('list')} disabled={saving}>Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="admin-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button className="admin-modal-close" onClick={() => setConfirmDelete(null)}>&times;</button>
            <h3>Excluir Aula</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Excluir a aula de <strong>{confirmDelete.disciplina_nome || 'Geral'}</strong> do dia{' '}
              <strong>{confirmDelete.data.split('-').reverse().join('/')}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              A chamada (presenças/faltas) daquele dia também será removida. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-danger" onClick={deleteAula}>Excluir</button>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {selectedDay && modalMode === 'avaliacaoForm' && (
        <div className="admin-modal-overlay" onClick={() => setModalMode('list')}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="admin-modal-close" onClick={() => setModalMode('list')}>&times;</button>
            <h3>{editingAvaliacao ? 'Editar Avaliação' : 'Agendar Avaliação'} — {selectedDay.split('-').reverse().join('/')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {avDisciplinaOpts.length === 0 && (
                <p className="admin-empty">Nenhuma disciplina alocada a você nesta turma. Avaliações exigem uma disciplina.</p>
              )}
              {avDisciplinaOpts.length > 0 && (
                <>
                  <div className="admin-field">
                    <label>Disciplina *</label>
                    <select value={avFormDisciplina} onChange={(e) => setAvFormDisciplina(e.target.value)} disabled={!!editingAvaliacao}>
                      {avDisciplinaOpts.map((d) => (
                        <option key={d.disciplina_id} value={d.disciplina_id}>{d.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-row">
                    <div className="admin-field">
                      <label>Tipo de avaliação *</label>
                      <select value={avFormTipo} onChange={(e) => setAvFormTipo(e.target.value)} disabled={!!editingAvaliacao}>
                        {TIPOS_AVALIACAO.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label>Bimestre *</label>
                      <select value={avFormBimestre} onChange={(e) => setAvFormBimestre(Number(e.target.value))}>
                        {[1, 2, 3, 4].map((b) => (
                          <option key={b} value={b}>{b}º Bimestre</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="admin-field">
                    <label>Descrição (opcional)</label>
                    <input
                      type="text"
                      value={avFormDescricao}
                      onChange={(e) => setAvFormDescricao(e.target.value)}
                      placeholder="Ex.: Prova de conteúdos do capítulo 3"
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    As notas lançadas alimentam automaticamente a média bimestral do boletim.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={salvarAvaliacao} disabled={saving || !avFormDisciplina}>
                      {saving ? 'Salvando...' : editingAvaliacao ? 'Salvar Alterações' : 'Agendar'}
                    </button>
                    <button className="btn btn-outline" onClick={() => setModalMode('list')} disabled={saving}>Voltar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDay && modalMode === 'notasForm' && notasAvaliacao && (
        <div className="admin-modal-overlay" onClick={() => setModalMode('list')}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <button className="admin-modal-close" onClick={() => setModalMode('list')}>&times;</button>
            <h3>
              {tipoLabel(notasAvaliacao.tipo)} — {notasAvaliacao.disciplina_nome || ''}
            </h3>
            <p style={{ margin: '2px 0 10px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
              {notasAvaliacao.bimestre}º bimestre · Notas de 0 a 10 (decimais ok, vírgula permitida). Deixe vazio para não lançar. A média bimestral é recalculada automaticamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="diario-chamada-list">
                {notasItems.length === 0 && <p className="admin-empty">Nenhum aluno enturmado nesta turma.</p>}
                {notasItems.map((n) => (
                  <div key={n.aluno_id} className="diario-nota-row">
                    <span className="diario-nota-nome">{n.aluno_nome}</span>
                    <input
                      className="diario-nota-input"
                      type="text"
                      inputMode="decimal"
                      value={n.nota}
                      onChange={(e) => setNotaItem(n.aluno_id, e.target.value)}
                      placeholder="—"
                      aria-label={`Nota de ${n.aluno_nome}`}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={salvarNotas} disabled={saving || notasItems.length === 0}>
                  {saving ? 'Salvando...' : 'Salvar Notas'}
                </button>
                <button className="btn btn-outline" onClick={() => setModalMode('list')} disabled={saving}>Voltar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteAv && (
        <div className="admin-modal-overlay" onClick={() => setConfirmDeleteAv(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button className="admin-modal-close" onClick={() => setConfirmDeleteAv(null)}>&times;</button>
            <h3>Excluir Avaliação</h3>
            <p style={{ fontSize: '0.9rem' }}>
              Excluir <strong>{tipoLabel(confirmDeleteAv.tipo)}</strong> de{' '}
              <strong>{confirmDeleteAv.disciplina_nome || ''}</strong> do dia{' '}
              <strong>{confirmDeleteAv.data.split('-').reverse().join('/')}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              As notas lançadas nesta avaliação serão removidas e a média bimestral recomposta. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-danger" onClick={deleteAvaliacao}>Excluir</button>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteAv(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
