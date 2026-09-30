import { useState, useEffect } from 'react'
import api from '../cms/api'

interface AnoLetivo {
  id: string
  ano: string
  inicio: string
  fim: string
  status: string
}

interface FormAno {
  id: string
  ano: string
  inicio: string
  fim: string
  status: string
}

export default function AnosLetivosManager() {
  const [anos, setAnos] = useState<AnoLetivo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormAno | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const load = async () => {
    setError('')
    try {
      const { data } = await api.get('/anos-letivos')
      setAnos(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar anos letivos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const emptyForm = (): FormAno => ({
    id: '',
    ano: String(new Date().getFullYear()),
    inicio: `${new Date().getFullYear()}-02-01`,
    fim: `${new Date().getFullYear()}-12-15`,
    status: 'ativo',
  })

  const save = async () => {
    if (!form) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/anos-letivos/${form.id}`, form)
      } else {
        await api.post('/anos-letivos', form)
      }
      setForm(null)
      load()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar ano letivo')
    }
  }

  const definirAtivo = async (a: AnoLetivo) => {
    if (!confirm(`Definir ${a.ano} como ano letivo ativo? Os demais serão encerrados.`)) return
    try {
      await api.put(`/anos-letivos/${a.id}`, { status: 'ativo' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao definir ano ativo')
    }
  }

  const del = async (a: AnoLetivo) => {
    if (!confirm(`Excluir o ano letivo ${a.ano}?`)) return
    try {
      await api.delete(`/anos-letivos/${a.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Anos Letivos</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Calendário institucional por ano letivo</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Novo Ano Letivo</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ano</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {anos.length === 0 && (
              <tr><td colSpan={5} className="admin-empty">Nenhum ano letivo cadastrado.</td></tr>
            )}
            {anos.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.ano}</strong></td>
                <td>{a.inicio || '-'}</td>
                <td>{a.fim || '-'}</td>
                <td>{a.status === 'ativo' ? 'Ativo' : a.status || '-'}</td>
                <td>
                  {a.status !== 'ativo' && (
                    <button className="btn btn-sm" onClick={() => definirAtivo(a)}>Definir Ativo</button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => setForm({ ...a })}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => del(a)}>Excluir</button>
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
            <h3>{form.id ? 'Editar Ano Letivo' : 'Novo Ano Letivo'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-field">
                <label>Ano *</label>
                <input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Início</label>
                  <input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Fim</label>
                  <input type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
                </div>
              </div>
              <div className="admin-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativo">Ativo</option>
                  <option value="encerrado">Encerrado</option>
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
