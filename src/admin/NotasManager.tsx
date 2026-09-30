import { useState, useEffect } from 'react'
import api from '../cms/api'

interface LinhaNota {
  aluno_id: string
  aluno_nome: string
  nota_id: string
  nota: string
  faltas: number
}

interface BoletimDisciplina {
  disciplina_id: string
  disciplina_nome: string
  abreviatura: string
  notas_bimestres: string[]
  media: number | null
  total_faltas: number
}

const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']

export default function NotasManager() {
  const [tab, setTab] = useState<'diario' | 'boletim'>('diario')
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [bimestre, setBimestre] = useState(1)
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [linhas, setLinhas] = useState<LinhaNota[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const [alunoBoletimId, setAlunoBoletimId] = useState('')
  const [boletim, setBoletim] = useState<{ aluno: string; turma_nome: string; ano_letivo: string; disciplinas: BoletimDisciplina[] } | null>(null)

  useEffect(() => {
    Promise.all([api.get('/turmas/select'), api.get('/disciplinas/select'), api.get('/historico-alunos/select')])
      .then(([t, d, a]) => { setTurmas(t.data); setDisciplinas(d.data); setAlunos(a.data) })
      .catch((err: any) => setStatusMsg(err.response?.data?.error || 'Erro ao carregar dados')
      )
  }, [])

  const carregarDiario = async () => {
    if (!turmaId || !disciplinaId) return
    setLoading(true)
    setStatusMsg('')
    try {
      const { data } = await api.get(`/notas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&bimestre=${bimestre}&ano_letivo=${ano}`)
      setLinhas(data)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao carregar diário')
    } finally {
      setLoading(false)
    }
  }

  const salvarDiario = async () => {
    if (!turmaId || !disciplinaId) return
    setStatusMsg('')
    try {
      const items = linhas.map((l) => ({ aluno_id: l.aluno_id, nota: l.nota, faltas: l.faltas }))
      const { data } = await api.post('/notas/bulk', {
        turma_id: turmaId,
        disciplina_id: disciplinaId,
        ano_letivo: ano,
        bimestre,
        items,
      })
      setStatusMsg(`${data.updated} registros salvos no ${BIMESTRES[bimestre - 1]}.`)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const carregarBoletim = async () => {
    if (!alunoBoletimId) return
    setStatusMsg('')
    try {
      const { data } = await api.get(`/notas/boletim/${alunoBoletimId}?ano_letivo=${ano}`)
      setBoletim(data)
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao carregar boletim')
    }
  }

  const alterarLinha = (alunoId: string, campo: 'nota' | 'faltas', valor: string) => {
    setLinhas((prev) => prev.map((l) => l.aluno_id === alunoId
      ? { ...l, [campo]: campo === 'faltas' ? Number(valor) || 0 : valor }
      : l))
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Notas e Boletim</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Diário de classe e boletim com médias</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${tab === 'diario' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('diario')}>Diário de Classe</button>
          <button className={`btn btn-sm ${tab === 'boletim' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('boletim')}>Boletim</button>
        </div>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}

      {tab === 'diario' && (
        <>
          <div className="admin-row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="admin-field">
              <label>Turma</label>
              <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Selecione</option>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label>Disciplina</label>
              <select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
                <option value="">Selecione</option>
                {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label>Bimestre</label>
              <select value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))}>
                {BIMESTRES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label>Ano Letivo</label>
              <input value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 100 }} />
            </div>
            <div className="admin-field">
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={carregarDiario}>Carregar</button>
            </div>
          </div>

          {loading && <p>Carregando...</p>}

          {!loading && turmaId && disciplinaId && (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th style={{ width: 110 }}>Nota</th>
                    <th style={{ width: 110 }}>Faltas</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr><td colSpan={3} className="admin-empty">Nenhum aluno na turma ou sem registros.</td></tr>
                  )}
                  {linhas.map((l) => (
                    <tr key={l.aluno_id}>
                      <td>{l.aluno_nome}</td>
                      <td>
                        <input
                          value={l.nota || ''}
                          onChange={(e) => alterarLinha(l.aluno_id, 'nota', e.target.value)}
                          placeholder="0 - 10"
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={l.faltas ?? ''}
                          onChange={(e) => alterarLinha(l.aluno_id, 'faltas', e.target.value)}
                          style={{ width: 90 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhas.length > 0 && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={salvarDiario}>
                  Salvar {BIMESTRES[bimestre - 1]}
                </button>
              )}
            </>
          )}
        </>
      )}

      {tab === 'boletim' && (
        <>
          <div className="admin-row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="admin-field" style={{ flex: 1, minWidth: 240 }}>
              <label>Aluno</label>
              <select value={alunoBoletimId} onChange={(e) => setAlunoBoletimId(e.target.value)}>
                <option value="">Selecione</option>
                {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label>Ano Letivo</label>
              <input value={ano} onChange={(e) => setAno(e.target.value)} style={{ width: 100 }} />
            </div>
            <div className="admin-field">
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={carregarBoletim}>Gerar Boletim</button>
            </div>
          </div>

          {boletim && (
            <>
              <h3 style={{ margin: '0 0 4px' }}>{boletim.aluno}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                {boletim.turma_nome || 'Sem turma vinculada'} · Ano letivo {boletim.ano_letivo}
              </p>
              {boletim.disciplinas.length === 0 ? (
                <p className="admin-empty">Nenhuma nota lançada para este aluno no ano letivo selecionado.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Disciplina</th>
                      {BIMESTRES.map((b) => <th key={b}>{b}</th>)}
                      <th>Média</th>
                      <th>Faltas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletim.disciplinas.map((d) => (
                      <tr key={d.disciplina_id}>
                        <td>{d.disciplina_nome}</td>
                        {d.notas_bimestres.map((n, i) => <td key={i}>{n || '-'}</td>)}
                        <td><strong>{d.media !== null ? d.media : '-'}</strong></td>
                        <td>{d.total_faltas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
