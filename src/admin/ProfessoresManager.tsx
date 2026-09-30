import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Professor {
  id: string
  nome: string
  email: string
  telefone: string
  cpf: string
  especialidade: string
  status: string
}

export default function ProfessoresManager() {
  const [professores, setProfessores] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Professor | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const load = async () => {
    setError('')
    try {
      const { data } = await api.get('/professores')
      setProfessores(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar professores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const emptyForm = (): Professor => ({
    id: '', nome: '', email: '', telefone: '', cpf: '', especialidade: '', status: 'ativo',
  })

  const save = async () => {
    if (!form || !form.nome) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/professores/${form.id}`, form)
      } else {
        await api.post('/professores', form)
      }
      setForm(null)
      load()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar professor')
    }
  }

  const remove = async (p: Professor) => {
    if (!confirm(`Excluir o professor "${p.nome}"?`)) return
    try {
      await api.delete(`/professores/${p.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Professores</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Cadastro de professores e vínculo com turmas</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Novo Professor</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>CPF</th>
              <th>Especialidade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {professores.length === 0 && (
              <tr><td colSpan={7} className="admin-empty">Nenhum professor cadastrado.</td></tr>
            )}
            {professores.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.email || '-'}</td>
                <td>{p.telefone || '-'}</td>
                <td>{p.cpf || '-'}</td>
                <td>{p.especialidade || '-'}</td>
                <td>{p.status === 'ativo' ? 'Ativo' : p.status || '-'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => { setForm({ ...p }); setStatusMsg('') }}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>Excluir</button>
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
            <h3>{form.id ? 'Editar Professor' : 'Novo Professor'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-field">
                <label>Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Telefone</label>
                  <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                </div>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>CPF</label>
                  <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Especialidade</label>
                  <input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} placeholder="ex.: Matemática" />
                </div>
              </div>
              <div className="admin-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={save}>Salvar</button>
                <button className="btn btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
