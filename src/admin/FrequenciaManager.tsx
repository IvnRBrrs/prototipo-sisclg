import { useState, useEffect } from 'react'
import api from '../cms/api'

interface LinhaFrequencia {
  aluno_id: string
  aluno_nome: string
  frequencia_id: string
  status: string
}

const STATUS = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'justificado', label: 'Justificado' },
]

export default function FrequenciaManager() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [linhas, setLinhas] = useState<LinhaFrequencia[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [resumo, setResumo] = useState<Record<string, any>>({})

  useEffect(() => {
    Promise.all([api.get('/turmas/select'), api.get('/disciplinas/select')])
      .then(([t, d]) => { setTurmas(t.data); setDisciplinas(d.data) })
      .catch((err: any) => setStatusMsg(err.response?.data?.error || 'Erro ao carregar dados'))
  }, [])

  const carregarChamada = async () => {
    if (!turmaId) return
    setLoading(true)
    setStatusMsg('')
    try {
      const resp = await api.get(`/frequencia?turma_id=${turmaId}&disciplina_id=${disciplinaId}&data=${data}`)
      setLinhas(resp.data)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao carregar chamada')
    } finally {
      setLoading(false)
    }
  }

  const salvarChamada = async () => {
    if (!turmaId) return
    setStatusMsg('')
    try {
      const items = linhas.map((l) => ({ aluno_id: l.aluno_id, status: l.status }))
      const resp = await api.post('/frequencia/bulk', {
        turma_id: turmaId,
        disciplina_id: disciplinaId,
        data,
        items,
      })
      setStatusMsg(`${resp.data.updated} presenças registradas em ${data}.`)
      carregarResumos()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const carregarResumos = async () => {
    if (!turmaId || linhas.length === 0) return
    const mapa: Record<string, any> = {}
    await Promise.all(linhas.map(async (l) => {
      try {
        const { data } = await api.get(`/frequencia/resumo/${l.aluno_id}?turma_id=${turmaId}`)
        mapa[l.aluno_id] = data
      } catch {}
    }))
    setResumo(mapa)
  }

  useEffect(() => {
    if (linhas.length > 0) carregarResumos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId])

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Frequência</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Chamada diária por turma e disciplina</p>
        </div>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}

      <div className="admin-row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="admin-field">
          <label>Turma *</label>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="admin-field">
          <label>Disciplina</label>
          <select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
            <option value="">Todas (geral)</option>
            {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div className="admin-field">
          <label>Data *</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="admin-field">
          <label>&nbsp;</label>
          <button className="btn btn-primary" onClick={carregarChamada}>Carregar Chamada</button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && turmaId && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th style={{ width: 160 }}>Status</th>
                <th style={{ width: 130 }}>% Presença</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr><td colSpan={3} className="admin-empty">Nenhum aluno na turma.</td></tr>
              )}
              {linhas.map((l) => (
                <tr key={l.aluno_id}>
                  <td>{l.aluno_nome}</td>
                  <td>
                    <select
                      value={l.status || 'presente'}
                      onChange={(e) => setLinhas((prev) => prev.map((x) => x.aluno_id === l.aluno_id ? { ...x, status: e.target.value } : x))}
                    >
                      {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>
                    {resumo[l.aluno_id]?.percentual_presenca !== null && resumo[l.aluno_id]?.percentual_presenca !== undefined
                      ? `${resumo[l.aluno_id].percentual_presenca}%`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length > 0 && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={salvarChamada}>Salvar Chamada</button>
          )}
        </>
      )}
    </div>
  )
}
