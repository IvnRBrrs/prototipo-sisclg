import { useState, useEffect } from 'react'
import api from '../cms/api'

interface ConselhoAluno {
  aluno_id: string
  aluno_nome: string
  media: number | null
  total_faltas: number
  total_ocorrencias: number
  conselho_id: string
  parecer: string
  observacao: string
}

const PARECERES = ['Aprovado', 'Reprovado', 'Recuperação', 'Em análise']
const BIMESTRES = [
  { value: 0, label: 'Anual (média geral)' },
  { value: 1, label: '1º Bimestre' },
  { value: 2, label: '2º Bimestre' },
  { value: 3, label: '3º Bimestre' },
  { value: 4, label: '4º Bimestre' },
]

export default function ConselhoClasseManager() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [bimestre, setBimestre] = useState(0)
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [linhas, setLinhas] = useState<ConselhoAluno[]>([])
  const [turmaNome, setTurmaNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    api.get('/turmas').then((t) => setTurmas(t.data)).catch(() => {})
  }, [])

  const carregar = async () => {
    if (!turmaId) return
    setLoading(true)
    setStatusMsg('')
    try {
      const { data } = await api.get(`/conselho-classe?turma_id=${turmaId}&bimestre=${bimestre}&ano_letivo=${ano}`)
      setLinhas(data.alunos)
      setTurmaNome(data.turma_nome)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao carregar conselho')
    } finally {
      setLoading(false)
    }
  }

  const salvar = async () => {
    if (!turmaId) return
    setStatusMsg('')
    try {
      const items = linhas.map((l) => ({
        aluno_id: l.aluno_id,
        parecer: l.parecer,
        observacao: l.observacao,
      }))
      const { data } = await api.post('/conselho-classe/bulk', {
        turma_id: turmaId,
        ano_letivo: ano,
        bimestre,
        items,
      })
      setStatusMsg(`${data.updated} pareceres salvos.`)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const alterar = (alunoId: string, campo: 'parecer' | 'observacao', valor: string) => {
    setLinhas((prev) => prev.map((l) => l.aluno_id === alunoId ? { ...l, [campo]: valor } : l))
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Conselho de Classe</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Deliberações com médias, faltas e ocorrências por aluno
          </p>
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
          <label>Período</label>
          <select value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))}>
            {BIMESTRES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div className="admin-field">
          <label>Ano Letivo</label>
          <input value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 100 }} />
        </div>
        <div className="admin-field">
          <label>&nbsp;</label>
          <button className="btn btn-primary" onClick={carregar}>Carregar</button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && turmaId && (
        <>
          {turmaNome && (
            <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Turma <strong>{turmaNome}</strong> · {BIMESTRES.find((b) => b.value === bimestre)?.label} · {ano}
            </p>
          )}
          <table className="admin-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th style={{ width: 90 }}>Média</th>
                <th style={{ width: 80 }}>Faltas</th>
                <th style={{ width: 90 }}>Ocorr.</th>
                <th style={{ width: 150 }}>Parecer</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">Nenhum aluno na turma.</td></tr>
              )}
              {linhas.map((l) => (
                <tr key={l.aluno_id}>
                  <td>{l.aluno_nome}</td>
                  <td>{l.media !== null ? l.media : '-'}</td>
                  <td>{l.total_faltas}</td>
                  <td>{l.total_ocorrencias}</td>
                  <td>
                    <select value={l.parecer} onChange={(e) => alterar(l.aluno_id, 'parecer', e.target.value)}>
                      <option value="">—</option>
                      {PARECERES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      value={l.observacao}
                      onChange={(e) => alterar(l.aluno_id, 'observacao', e.target.value)}
                      placeholder="Observação..."
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {linhas.length > 0 && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={salvar}>Salvar Deliberações</button>
          )}
        </>
      )}
    </div>
  )
}
