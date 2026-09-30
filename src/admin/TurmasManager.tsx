import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Turma {
  id: string
  nome: string
  serie: string
  periodo: string
  sala: string
  ano_letivo: string
  professor_responsavel_id: string
  status: string
  professor_nome?: string
}

interface TurmaAluno {
  id: string
  nome: string
  sexo: string
  ano_letivo_atual: string
  turma: string
  aluno_turma_id: string
  enturmacao_status: string
}

interface TurmaDisciplina {
  turma_disciplina_id: string
  disciplina_id: string
  disciplina_nome: string
  abreviatura: string
  professor_id: string
  professor_nome: string
}

const SERIES = ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano', '1ª série', '2ª série', '3ª série']
const PERIODOS = ['', 'Matutino', 'Vespertino', 'Noturno', 'Integral']

export default function TurmasManager() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [professores, setProfessores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Turma | null>(null)
  const [detail, setDetail] = useState<Turma | null>(null)
  const [detailAlunos, setDetailAlunos] = useState<TurmaAluno[]>([])
  const [detailDisciplinas, setDetailDisciplinas] = useState<TurmaDisciplina[]>([])
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<any[]>([])
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<any[]>([])
  const [novoAlunoId, setNovoAlunoId] = useState('')
  const [novaDisciplinaId, setNovaDisciplinaId] = useState('')
  const [novoProfessorId, setNovoProfessorId] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const loadTurmas = async () => {
    setError('')
    try {
      const { data } = await api.get('/turmas')
      const { data: profs } = await api.get('/professores')
      setProfessores(profs)
      const profMap: Record<string, string> = {}
      profs.forEach((p: any) => { profMap[p.id] = p.nome })
      setTurmas(data.map((t: any) => ({ ...t, professor_nome: profMap[t.professor_responsavel_id] || '' })))
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar turmas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTurmas() }, [])

  const emptyForm = (): Turma => ({
    id: '', nome: '', serie: '', periodo: '', sala: '', ano_letivo: '', professor_responsavel_id: '', status: 'ativa',
  })

  const openDetail = async (t: Turma) => {
    setDetail(t)
    setDetailAlunos([])
    setDetailDisciplinas([])
    setNovoAlunoId('')
    setNovaDisciplinaId('')
    setNovoProfessorId('')
    try {
      const [alunosRes, discRes, allAlunos, allDisc] = await Promise.all([
        api.get(`/turmas/${t.id}/alunos`),
        api.get(`/turmas/${t.id}/disciplinas`),
        api.get('/historico-alunos/select'),
        api.get('/disciplinas/select'),
      ])
      setDetailAlunos(alunosRes.data)
      setDetailDisciplinas(discRes.data)
      const enturmados = new Set(alunosRes.data.map((a: TurmaAluno) => a.id))
      setAlunosDisponiveis(allAlunos.data.filter((a: any) => !enturmados.has(a.id)))
      const vinculadas = new Set(discRes.data.map((d: TurmaDisciplina) => d.disciplina_id))
      setDisciplinasDisponiveis(allDisc.data.filter((d: any) => !vinculadas.has(d.id)))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao carregar detalhes')
    }
  }

  const saveTurma = async () => {
    if (!form) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/turmas/${form.id}`, form)
      } else {
        await api.post('/turmas', form)
      }
      setForm(null)
      loadTurmas()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar turma')
    }
  }

  const deleteTurma = async (t: Turma) => {
    if (!confirm(`Excluir a turma "${t.nome}"? Os vínculos de alunos e disciplinas serão removidos.`)) return
    try {
      await api.delete(`/turmas/${t.id}`)
      if (detail?.id === t.id) setDetail(null)
      loadTurmas()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  const enturmarAluno = async () => {
    if (!detail || !novoAlunoId) return
    try {
      await api.post(`/turmas/${detail.id}/alunos`, { aluno_id: novoAlunoId })
      setNovoAlunoId('')
      openDetail(detail)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao enturmar')
    }
  }

  const desenturmarAluno = async (a: TurmaAluno) => {
    if (!detail || !confirm(`Remover "${a.nome}" desta turma?`)) return
    try {
      await api.delete(`/turmas/${detail.id}/alunos/${a.id}`)
      openDetail(detail)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover')
    }
  }

  const vincularDisciplina = async () => {
    if (!detail || !novaDisciplinaId) return
    try {
      await api.post(`/turmas/${detail.id}/disciplinas`, {
        disciplina_id: novaDisciplinaId,
        professor_id: novoProfessorId,
      })
      setNovaDisciplinaId('')
      setNovoProfessorId('')
      openDetail(detail)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao vincular')
    }
  }

  const desvincularDisciplina = async (d: TurmaDisciplina) => {
    if (!detail || !confirm(`Remover "${d.disciplina_nome}" desta turma?`)) return
    try {
      await api.delete(`/turmas/${detail.id}/disciplinas/${d.turma_disciplina_id}`)
      openDetail(detail)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao desvincular')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Turmas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Gestão de turmas, enturmação e vínculo de disciplinas</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Nova Turma</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Série</th>
              <th>Período</th>
              <th>Sala</th>
              <th>Ano Letivo</th>
              <th>Professor Responsável</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.length === 0 && (
              <tr><td colSpan={8} className="admin-empty">Nenhuma turma cadastrada.</td></tr>
            )}
            {turmas.map((t) => (
              <tr key={t.id}>
                <td>{t.nome}</td>
                <td>{t.serie || '-'}</td>
                <td>{t.periodo || '-'}</td>
                <td>{t.sala || '-'}</td>
                <td>{t.ano_letivo || '-'}</td>
                <td>{t.professor_nome || '-'}</td>
                <td>{t.status === 'ativa' ? 'Ativa' : t.status || '-'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => openDetail(t)}>Detalhes</button>
                  <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...t }); setStatusMsg('') }}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTurma(t)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {form && (
        <div className="admin-modal-overlay" onClick={() => setForm(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="admin-modal-close" onClick={() => setForm(null)}>&times;</button>
            <h3>{form.id ? 'Editar Turma' : 'Nova Turma'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-field">
                <label>Nome da Turma *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex.: 7º Ano B" />
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Série</label>
                  <select value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })}>
                    <option value="">Selecione</option>
                    {SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Período</label>
                  <select value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })}>
                    {PERIODOS.map((p) => <option key={p || 'vazio'} value={p}>{p || 'Selecione'}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Sala</label>
                  <input value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Ano Letivo</label>
                  <input value={form.ano_letivo} onChange={(e) => setForm({ ...form, ano_letivo: e.target.value })} placeholder={String(new Date().getFullYear())} />
                </div>
              </div>
              <div className="admin-field">
                <label>Professor Responsável</label>
                <select value={form.professor_responsavel_id} onChange={(e) => setForm({ ...form, professor_responsavel_id: e.target.value })}>
                  <option value="">Nenhum</option>
                  {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={saveTurma}>Salvar</button>
                <button className="btn btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="admin-modal-overlay" onClick={() => setDetail(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '85vh', overflowY: 'auto' }}>
            <button className="admin-modal-close" onClick={() => setDetail(null)}>&times;</button>
            <h3 style={{ margin: '0 0 4px' }}>{detail.nome}</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              {[detail.serie, detail.periodo, detail.sala].filter(Boolean).join(' · ') || 'Sem detalhes'}
            </p>

            <h4 style={{ margin: '0 0 8px' }}>Alunos na Turma ({detailAlunos.length})</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select value={novoAlunoId} onChange={(e) => setNovoAlunoId(e.target.value)} style={{ flex: 1 }}>
                <option value="">Selecione um aluno para enturmar</option>
                {alunosDisponiveis.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <button className="btn btn-sm" onClick={enturmarAluno} disabled={!novoAlunoId}>Enturmar</button>
            </div>
            {detailAlunos.length === 0 ? (
              <p className="admin-empty">Nenhum aluno nesta turma.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Aluno</th><th>Série</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {detailAlunos.map((a) => (
                    <tr key={a.aluno_turma_id}>
                      <td>{a.nome}</td>
                      <td>{a.ano_letivo_atual || '-'}</td>
                      <td>{a.enturmacao_status === 'ativo' ? 'Ativo' : a.enturmacao_status || '-'}</td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => desenturmarAluno(a)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4 style={{ margin: '20px 0 8px' }}>Disciplinas ({detailDisciplinas.length})</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <select value={novaDisciplinaId} onChange={(e) => setNovaDisciplinaId(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">Disciplina</option>
                {disciplinasDisponiveis.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <select value={novoProfessorId} onChange={(e) => setNovoProfessorId(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">Professor (opcional)</option>
                {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button className="btn btn-sm" onClick={vincularDisciplina} disabled={!novaDisciplinaId}>Vincular</button>
            </div>
            {detailDisciplinas.length === 0 ? (
              <p className="admin-empty">Nenhuma disciplina vinculada.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Disciplina</th><th>Abreviatura</th><th>Professor</th><th></th></tr>
                </thead>
                <tbody>
                  {detailDisciplinas.map((d) => (
                    <tr key={d.turma_disciplina_id}>
                      <td>{d.disciplina_nome}</td>
                      <td>{d.abreviatura || '-'}</td>
                      <td>{d.professor_nome || '-'}</td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => desvincularDisciplina(d)}>Remover</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
