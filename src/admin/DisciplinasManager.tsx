import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Disciplina {
  id: string
  nome: string
  abreviatura: string
  carga_horaria: string
}

export default function DisciplinasManager() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Disciplina | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const load = async () => {
    setError('')
    try {
      const { data } = await api.get('/disciplinas')
      setDisciplinas(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar disciplinas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const emptyForm = (): Disciplina => ({ id: '', nome: '', abreviatura: '', carga_horaria: '' })

  const save = async () => {
    if (!form || !form.nome) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/disciplinas/${form.id}`, form)
      } else {
        await api.post('/disciplinas', form)
      }
      setForm(null)
      load()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar disciplina')
    }
  }

  const remove = async (d: Disciplina) => {
    if (!confirm(`Excluir a disciplina "${d.nome}"?`)) return
    try {
      await api.delete(`/disciplinas/${d.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Disciplinas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Cadastro de disciplinas do currículo</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Nova Disciplina</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Abreviatura</th>
              <th>Carga Horária</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {disciplinas.length === 0 && (
              <tr><td colSpan={4} className="admin-empty">Nenhuma disciplina cadastrada.</td></tr>
            )}
            {disciplinas.map((d) => (
              <tr key={d.id}>
                <td>{d.nome}</td>
                <td>{d.abreviatura || '-'}</td>
                <td>{d.carga_horaria || '-'}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => { setForm({ ...d }); setStatusMsg('') }}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {form && (
        <div className="admin-modal-overlay" onClick={() => setForm(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="admin-modal-close" onClick={() => setForm(null)}>&times;</button>
            <h3>{form.id ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-field">
                <label>Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex.: Matemática" />
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Abreviatura</label>
                  <input value={form.abreviatura} onChange={(e) => setForm({ ...form, abreviatura: e.target.value })} placeholder="ex.: MAT" />
                </div>
                <div className="admin-field">
                  <label>Carga Horária</label>
                  <input value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} placeholder="ex.: 80h" />
                </div>
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
