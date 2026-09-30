import { useState, useEffect } from 'react'
import api from '../cms/api'

interface Ocorrencia {
  id: string
  aluno_id: string
  aluno_nome: string
  data: string
  tipo: string
  descricao: string
  responsavel_id: string
  can_edit?: boolean
}

interface FormOcorrencia {
  id: string
  aluno_id: string
  data: string
  tipo: string
  descricao: string
}

const TIPOS = ['advertencia_verbal', 'advertencia_escrita', 'suspensao', 'elogio', 'comunicado', 'outra']
const TIPO_LABEL: Record<string, string> = {
  advertencia_verbal: 'Advertência Verbal',
  advertencia_escrita: 'Advertência Escrita',
  suspensao: 'Suspensão',
  elogio: 'Elogio',
  comunicado: 'Comunicado',
  outra: 'Outra',
}

export default function OcorrenciasManager() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [filtroAluno, setFiltroAluno] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormOcorrencia | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const load = async () => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (filtroAluno) params.set('aluno_id', filtroAluno)
      if (filtroTipo) params.set('tipo', filtroTipo)
      const qs = params.toString()
      const [oRes, aRes] = await Promise.all([
        api.get(`/ocorrencias${qs ? `?${qs}` : ''}`),
        api.get('/historico-alunos/select'),
      ])
      setOcorrencias(oRes.data)
      setAlunos(aRes.data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar ocorrências')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const emptyForm = (): FormOcorrencia => ({
    id: '',
    aluno_id: '',
    data: new Date().toISOString().slice(0, 10),
    tipo: 'advertencia_verbal',
    descricao: '',
  })

  const save = async () => {
    if (!form) return
    setStatusMsg('')
    try {
      if (form.id) {
        await api.put(`/ocorrencias/${form.id}`, form)
      } else {
        await api.post('/ocorrencias', form)
      }
      setForm(null)
      load()
    } catch (err: any) {
      setStatusMsg(err.response?.data?.error || 'Erro ao salvar ocorrência')
    }
  }

  const del = async (o: Ocorrencia) => {
    if (!confirm(`Excluir a ocorrência de "${o.aluno_nome}"?`)) return
    try {
      await api.delete(`/ocorrencias/${o.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir')
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Ocorrências</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>Registro disciplinar e de comunicação por aluno</p>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(emptyForm()); setStatusMsg('') }}>+ Nova Ocorrência</button>
      </div>

      {statusMsg && <p style={{ marginBottom: 12, fontSize: '0.85rem' }}>{statusMsg}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <>
          <div className="admin-row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="admin-field" style={{ flex: 1, minWidth: 220 }}>
              <label>Filtrar por Aluno</label>
              <select value={filtroAluno} onChange={(e) => { setFiltroAluno(e.target.value); setTimeout(load, 0) }}>
                <option value="">Todos</option>
                {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label>Tipo</label>
              <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setTimeout(load, 0) }}>
                <option value="">Todos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Aluno</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ocorrencias.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">Nenhuma ocorrência registrada.</td></tr>
              )}
              {ocorrencias.map((o) => (
                <tr key={o.id}>
                  <td>{o.data || '-'}</td>
                  <td>{o.aluno_nome || '-'}</td>
                  <td>{TIPO_LABEL[o.tipo] || o.tipo || '-'}</td>
                  <td>{o.descricao}</td>
                  <td>
                    {o.can_edit !== false && (
                      <button className="btn btn-sm btn-outline" onClick={() => setForm({
                        id: o.id,
                        aluno_id: o.aluno_id,
                        data: o.data || '',
                        tipo: o.tipo,
                        descricao: o.descricao,
                      })}>Editar</button>
                    )}
                    {o.can_edit !== false && (
                      <button className="btn btn-sm btn-danger" onClick={() => del(o)}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {form && (
        <div className="admin-modal-overlay" onClick={() => setForm(null)}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="admin-modal-close" onClick={() => setForm(null)}>&times;</button>
            <h3>{form.id ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-field">
                <label>Aluno *</label>
                <select value={form.aluno_id} onChange={(e) => setForm({ ...form, aluno_id: e.target.value })} disabled={!!form.id}>
                  <option value="">Selecione</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="admin-row">
                <div className="admin-field">
                  <label>Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
                <div className="admin-field">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-field">
                <label>Descrição *</label>
                <textarea
                  rows={4}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva a ocorrência..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={save} disabled={!form.aluno_id || !form.descricao.trim()}>Salvar</button>
                <button className="btn btn-outline" onClick={() => setForm(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
