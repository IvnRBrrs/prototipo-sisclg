import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Matricula {
  id: string
  aluno_id: string
  aluno_nome: string
  turma_id: string
  turma_nome: string
  ano_letivo: string
  numero: string
  codigo_acesso: string
  data_matricula: string
  status: string
  origem: string
}

interface FormMatricula {
  id: string
  aluno_id: string
  turma_id: string
  ano_letivo: string
  data_matricula: string
  status: string
  origem: string
}

const STATUS = ['matriculado', 'rematriculado', 'trancado', 'transferido', 'concluido', 'cancelado']
const ORIGENS = ['cliente', 'rematricula', 'transferencia']

export default function MatriculasManager() {
  const [matriculas, setMatriculas] = useState<Matricula[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormMatricula | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const loadMatriculas = async () => {
    setError('')
    try {
      const [mRes, aRes, tRes] = await Promise.all([
        api.get('/matriculas'),
        api.get('/historico-alunos/select'),
        api.get('/turmas/select'),
      ])
      setMatriculas(mRes.data)
      setAlunos(aRes.data)
      setTurmas(tRes.data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar matrículas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMatriculas() }, [])

  const emptyForm = (): FormMatricula => ({
    id: '',
    aluno_id: '',
    turma_id: '',
    ano_letivo: String(new Date().getFullYear()),
    data_matricula: new Date().toISOString().slice(0, 10),
    status: 'matriculado',
    origem: 'cliente',
  })

  const saveMatricula = async () => {
    if (!form) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/matriculas/${form.id}`, {
          turma_id: form.turma_id,
          ano_letivo: form.ano_letivo,
          data_matricula: form.data_matricula,
          status: form.status,
        })
      } else {
        const { data } = await api.post('/matriculas', form)
        setStatusMsg(`Matrícula criada — Nº ${data.numero} · Código de acesso: ${data.codigo_acesso}`)
      }
      setForm(null)
      loadMatriculas()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar matrícula')
    }
  }

  const rematricular = async (m: Matricula) => {
    const novoAno = prompt(`Rematricular "${m.aluno_nome}" para o ano letivo:`, String(new Date().getFullYear() + 1))
    if (!novoAno) return
    try {
      const { data } = await api.post(`/matriculas/${m.id}/rematricula`, { novo_ano_letivo: novoAno.trim() })
      alert(`Rematrícula realizada!\nAluno: ${data.aluno_nome}\nNº: ${data.numero}\nCódigo de acesso: ${data.codigo_acesso}`)
      loadMatriculas()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao rematricular')
    }
  }

  const deleteMatricula = async (m: Matricula) => {
    if (!confirm(`Excluir a matrícula Nº ${m.numero} de "${m.aluno_nome}"?`)) return
    try {
      await api.delete(`/matriculas/${m.id}`)
      loadMatriculas()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Matrículas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
            Matrícula e rematrícula oficial com geração de número e código de acesso
          </p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Nova Matrícula</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Aluno</th>
              <th>Turma</th>
              <th>Ano Letivo</th>
              <th>Código Acesso</th>
              <th>Origem</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {matriculas.length === 0 && (
              <tr><td colSpan={8} className="admin-empty">Nenhuma matrícula cadastrada.</td></tr>
            )}
            {matriculas.map((m) => (
              <tr key={m.id}>
                <td>{m.numero}</td>
                <td>{m.aluno_nome || '-'}</td>
                <td>{m.turma_nome || '-'}</td>
                <td>{m.ano_letivo || '-'}</td>
                <td>{m.codigo_acesso || '-'}</td>
                <td>{m.origem || '-'}</td>
                <td>{m.status || '-'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => rematricular(m)}>Rematricular</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setForm({
                    id: m.id,
                    aluno_id: m.aluno_id,
                    turma_id: m.turma_id,
                    ano_letivo: m.ano_letivo,
                    data_matricula: m.data_matricula || '',
                    status: m.status,
                    origem: m.origem,
                  })}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteMatricula(m)}>Excluir</button>
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
            <h3>{form.id ? 'Editar Matrícula' : 'Nova Matrícula'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!form.id && (
                <div className="admin-field">
                  <label>Aluno *</label>
                  <select value={form.aluno_id} onChange={(e) => setForm({ ...form, aluno_id: e.target.value })}>
                    <option value="">Selecione o aluno</option>
                    {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              )}
              {form.id && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-light)' }}>
                  Aluno: <strong>{matriculas.find((m) => m.id === form.id)?.aluno_nome || '-'}</strong>
                </p>
              )}
              <div className="admin-field">
                <label>Turma</label>
                <select value={form.turma_id} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
                  <option value="">Sem turma</option>
                  {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Ano Letivo *</label>
                  <input value={form.ano_letivo} onChange={(e) => setForm({ ...form, ano_letivo: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Data da Matrícula</label>
                  <input type="date" value={form.data_matricula} onChange={(e) => setForm({ ...form, data_matricula: e.target.value })} />
                </div>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Origem</label>
                  <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
                    {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={saveMatricula} disabled={!form.aluno_id && !form.id}>Salvar</button>
                <button className="btn btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
