import { useState, useEffect, useRef } from 'react'
import api from '../cms/api'
import { fetchAlunosCached, invalidateCache, getCachedAlunosSync } from '../cms/contentCache'

const CATEGORIAS_ALUNO = [
  { key: 'rg_aluno', label: 'RG' },
  { key: 'cpf_aluno', label: 'CPF' },
  { key: 'certidao_nascimento', label: 'Certidão de Nascimento' },
  { key: 'laudo_medico', label: 'Laudo Médico' },
  { key: 'declaracao_transferencia', label: 'Declaração de Transferência' },
  { key: 'declaracao_financeira', label: 'Declaração Financeira' },
  { key: 'historico_anterior', label: 'Histórico Anterior' },
  { key: 'historico', label: 'Histórico' },
]

const CATEGORIAS_RESPONSAVEL = [
  { key: 'rg_responsavel', label: 'RG' },
  { key: 'cpf_responsavel', label: 'CPF' },
  { key: 'endereco_responsavel', label: 'Endereço' },
  { key: 'telefone_responsavel', label: 'Telefone' },
]

const CAMPOS_CADASTRO = [
  { key: 'nome', label: 'Nome do Aluno', type: 'text', required: true },
  { key: 'sexo', label: 'Sexo', type: 'select', options: ['', 'Masculino', 'Feminino'] },
  { key: 'escolaridade', label: 'Escolaridade', type: 'text' },
  { key: 'turma', label: 'Turma Ano Anterior', type: 'text' },
  { key: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
  { key: 'naturalidade', label: 'Naturalidade', type: 'text' },
  { key: 'ano_letivo_atual', label: 'Ano Letivo Atual', type: 'select', options: [
    '', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano',
    '6º ano', '7º ano', '8º ano', '9º ano',
    '1ª série', '2ª série', '3ª série',
  ] },
  { key: 'turma_atual', label: 'Turma Atual', type: 'select', options: ['', 'Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E'] },
  { key: 'periodo', label: 'Período', type: 'select', options: ['', 'Matutino', 'Vespertino', 'Noturno', 'Integral'] },
  { key: 'cpf', label: 'CPF do Aluno', type: 'text' },
  { key: 'nome_pai', label: 'Nome do Pai', type: 'text' },
  { key: 'nome_mae', label: 'Nome da Mãe', type: 'text' },
  { key: 'telefone_pais', label: 'Telefone dos Pais', type: 'text' },
  { key: 'telefone', label: 'Whatsapp dos Pais', type: 'text' },
  { key: 'responsavel_financeiro', label: 'Responsável Financeiro', type: 'text' },
  { key: 'cpf_responsavel', label: 'CPF do Responsável Financeiro', type: 'text' },
  { key: 'telefone_contato', label: 'Tel./Whatsapp do Resp. Financeiro', type: 'text' },
  { key: 'endereco', label: 'Endereço', type: 'text' },
]

interface AnexoEntry {
  categoria: string
  filename: string
  data: string
  type: string
  id?: string
}

interface Aluno {
  id: string
  [key: string]: any
}

export default function HistoricoAlunos({ onNavigate }: { onNavigate?: (view: string, section?: string, alunoId?: string) => void }) {
  const [tab, setTab] = useState<'novo' | 'listar'>('listar')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (id: string) => {
    setEditingId(id)
    setTab('novo')
  }

  const handleSalvo = () => {
    invalidateCache('alunos')
    setEditingId(null)
    setTab('listar')
  }

  const handleNovo = () => {
    setEditingId(null)
    setTab('novo')
  }

  return (
    <div className="admin-historico-alunos">
      <h2>Cadastro de Alunos</h2>

      <div className="admin-tabs" style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
        <button
          className={tab === 'listar' ? 'active' : ''}
          onClick={() => setTab('listar')}
          style={{
            padding: '8px 20px', border: 'none', background: tab === 'listar' ? 'var(--primary)' : 'transparent',
            color: tab === 'listar' ? '#fff' : 'var(--text)', cursor: 'pointer', borderRadius: '6px 6px 0 0',
            fontWeight: tab === 'listar' ? 600 : 400,
          }}
        >
          Alunos Cadastrados
        </button>
        <button
          className={tab === 'novo' ? 'active' : ''}
          onClick={handleNovo}
          style={{
            padding: '8px 20px', border: 'none', background: tab === 'novo' ? 'var(--primary)' : 'transparent',
            color: tab === 'novo' ? '#fff' : 'var(--text)', cursor: 'pointer', borderRadius: '6px 6px 0 0',
            fontWeight: tab === 'novo' ? 600 : 400,
          }}
        >
          {editingId ? 'Editando Cadastro' : 'Novo Cadastro'}
        </button>
      </div>

      {tab === 'novo' ? (
        <NovoCadastro onSalvo={handleSalvo} editId={editingId} />
      ) : (
        <AlunosCadastrados onEdit={handleEdit} onNavigate={onNavigate} />
      )}
    </div>
  )
}

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2)}`
  return `(${d.slice(0, 2)})${d.slice(2, 7)}-${d.slice(7)}`
}

function formatDateBR(val: string): string {
  if (!val) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-')
    return `${d}/${m}/${y}`
  }
  try { return new Date(val.replace(' ', 'T')).toLocaleDateString('pt-BR') } catch { return val }
}

function NovoCadastro({ onSalvo, editId }: { onSalvo: () => void; editId?: string | null }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [anexosAluno, setAnexosAluno] = useState<Record<string, AnexoEntry>>({})
  const [anexosResp, setAnexosResp] = useState<Record<string, AnexoEntry>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileTarget, setFileTarget] = useState<{ group: 'aluno' | 'resp'; categoria: string } | null>(null)
  const isEditing = !!editId

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api.get(`/historico-alunos/${editId}`).then(({ data }) => {
      const aluno = data.aluno
      if (aluno) {
        const f: Record<string, string> = {}
        for (const campo of CAMPOS_CADASTRO) {
          f[campo.key] = aluno[campo.key] || ''
        }
        setForm(f)
      }
      const anexos: Record<string, AnexoEntry> = {}
      for (const a of (data.anexos || [])) {
        const catGroup = CATEGORIAS_ALUNO.find((c) => c.key === a.categoria) ? 'aluno' : 'resp'
        const target = catGroup === 'aluno' ? anexosAluno : anexosResp
        anexos[a.categoria] = { id: a.id, categoria: a.categoria, filename: a.filename, data: a.data, type: a.type }
      }
      const aa: Record<string, AnexoEntry> = {}
      const ar: Record<string, AnexoEntry> = {}
      for (const a of (data.anexos || [])) {
        const entry: AnexoEntry = { id: a.id, categoria: a.categoria, filename: a.filename, data: a.data, type: a.type }
        if (CATEGORIAS_ALUNO.find((c) => c.key === a.categoria)) {
          aa[a.categoria] = entry
        } else {
          ar[a.categoria] = entry
        }
      }
      setAnexosAluno(aa)
      setAnexosResp(ar)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [editId])

  const setField = (key: string, value: string) => {
    let formatted = value
    if (key === 'cpf' || key === 'cpf_responsavel') formatted = formatCPF(value)
    else if (key === 'telefone' || key === 'telefone_pais' || key === 'telefone_contato') formatted = formatPhone(value)
    setForm((f) => ({ ...f, [key]: formatted }))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !fileTarget) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      const entry: AnexoEntry = { categoria: fileTarget.categoria, filename: file.name, data, type: file.type }
      if (fileTarget.group === 'aluno') {
        setAnexosAluno((a) => ({ ...a, [fileTarget.categoria]: entry }))
      } else {
        setAnexosResp((a) => ({ ...a, [fileTarget.categoria]: entry }))
      }
      setFileTarget(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  useEffect(() => {
    if (fileTarget && fileInputRef.current) fileInputRef.current.click()
  }, [fileTarget])

  const removeAnexo = async (categoria: string, group: 'aluno' | 'resp') => {
    const setter = group === 'aluno' ? setAnexosAluno : setAnexosResp
    const anexosAtuais = group === 'aluno' ? anexosAluno : anexosResp
    const entry = anexosAtuais[categoria]
    if (entry?.id) {
      try { await api.delete(`/historico-alunos/anexos/${entry.id}`) } catch { }
    }
    setter((a) => { const b = { ...a }; delete b[categoria]; return b })
  }

  const handleSubmit = async () => {
    if (!form.nome?.trim()) { setError('Nome do aluno é obrigatório'); return }
    setError('')
    setSaving(true)
    try {
      if (isEditing && editId) {
        const body: Record<string, string> = {}
        for (const campo of CAMPOS_CADASTRO) {
          if (form[campo.key] !== undefined) body[campo.key] = form[campo.key]
        }
        await api.put(`/historico-alunos/${editId}`, body)

        const newAnexos = [...Object.values(anexosAluno), ...Object.values(anexosResp)].filter((a) => !a.id)
        for (const anexo of newAnexos) {
          await api.post(`/historico-alunos/${editId}/anexos`, anexo)
        }
      } else {
        const { data } = await api.post('/historico-alunos', form)
        const alunoId = data.id
        const allAnexos = [...Object.values(anexosAluno), ...Object.values(anexosResp)]
        for (const anexo of allAnexos) {
          await api.post(`/historico-alunos/${alunoId}/anexos`, anexo)
        }
      }
      onSalvo()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const renderAnexoSection = (
    title: string,
    categorias: typeof CATEGORIAS_ALUNO,
    anexos: Record<string, AnexoEntry>,
    group: 'aluno' | 'resp',
  ) => (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ margin: '0 0 8px', color: 'var(--primary-dark)' }}>{title}</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {categorias.map((cat) => {
          const entry = anexos[cat.key]
          return (
            <div key={cat.key} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: '0.82rem',
              border: entry ? '2px solid #28a745' : '1px solid var(--border)',
              background: entry ? '#f0fff4' : 'var(--bg)',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              {entry ? (
                <>
                  <a href={entry.data} download={entry.filename} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✅ {cat.label}
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>({entry.filename})</span>
                  </a>
                  <button
                    style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                    onClick={() => removeAnexo(cat.key, group)}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span style={{ cursor: 'pointer' }} onClick={() => setFileTarget({ group, categoria: cat.key })}>
                  📎 {cat.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  if (loading) return <p>Carregando dados do aluno...</p>

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="*" style={{ display: 'none' }} onChange={handleFileSelect} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
        {CAMPOS_CADASTRO.map((campo) => (
          <div className="admin-field" key={campo.key}>
            <label>{campo.label}{campo.required ? ' *' : ''}</label>
            {campo.type === 'select' ? (
              campo.key === 'ano_letivo_atual' ? (
                <select value={form[campo.key] || ''} onChange={(e) => setField(campo.key, e.target.value)}>
                  <option value="">Selecione a série</option>
                  <optgroup label="Ensino Fundamental 1">
                    <option value="1º ano">1º ano</option>
                    <option value="2º ano">2º ano</option>
                    <option value="3º ano">3º ano</option>
                    <option value="4º ano">4º ano</option>
                    <option value="5º ano">5º ano</option>
                  </optgroup>
                  <optgroup label="Ensino Fundamental 2">
                    <option value="6º ano">6º ano</option>
                    <option value="7º ano">7º ano</option>
                    <option value="8º ano">8º ano</option>
                    <option value="9º ano">9º ano</option>
                  </optgroup>
                  <optgroup label="Ensino Médio">
                    <option value="1ª série">1ª série</option>
                    <option value="2ª série">2ª série</option>
                    <option value="3ª série">3ª série</option>
                  </optgroup>
                </select>
              ) : (
                <select value={form[campo.key] || ''} onChange={(e) => setField(campo.key, e.target.value)}>
                  {campo.options!.map((o) => <option key={o} value={o}>{o || 'Selecione'}</option>)}
                </select>
              )
            ) : (
              <input
                type={campo.type}
                value={form[campo.key] || ''}
                onChange={(e) => setField(campo.key, e.target.value)}
                placeholder={campo.label}
              />
            )}
          </div>
        ))}
      </div>

      {renderAnexoSection('Anexos do Aluno', CATEGORIAS_ALUNO, anexosAluno, 'aluno')}
      {renderAnexoSection('Anexos do Resp. Financeiro', CATEGORIAS_RESPONSAVEL, anexosResp, 'resp')}

      {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvando...' : isEditing ? 'Atualizar Cadastro' : 'Salvar Cadastro'}
        </button>
      </div>
    </div>
  )
}

function AlunosCadastrados({ onEdit, onNavigate }: { onEdit: (id: string) => void; onNavigate?: (view: string, section?: string, alunoId?: string) => void }) {
  const [alunos, setAlunos] = useState<Aluno[]>(() => getCachedAlunosSync() || [])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(() => !getCachedAlunosSync())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAnexos, setSelectedAnexos] = useState<any[]>([])
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => { loadAlunos() }, [])

  const loadAlunos = async (term?: string) => {
    if (!term) setLoading(alunos.length === 0)
    try {
      if (term?.trim()) {
        const params = `?search=${encodeURIComponent(term.trim())}`
        const { data } = await api.get(`/historico-alunos${params}`)
        setAlunos(data)
      } else {
        const { data } = await fetchAlunosCached()
        setAlunos(data)
      }
    } catch {
      if (!term) setAlunos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => loadAlunos(search)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const viewAluno = async (id: string) => {
    try {
      const { data } = await api.get(`/historico-alunos/${id}`)
      setSelectedId(id)
      setSelectedAnexos(data.anexos || [])
      setShowDetail(true)
    } catch { }
  }

  const deleteAluno = async (id: string) => {
    if (!confirm('Excluir este cadastro?')) return
    try {
      await api.delete(`/historico-alunos/${id}`)
      invalidateCache('alunos')
      loadAlunos(search)
      if (selectedId === id) setShowDetail(false)
    } catch { }
  }

  const formatDate = (d: string) => {
    if (!d) return '-'
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-')
      return `${day}/${m}/${y}`
    }
    try { return new Date(d.replace(' ', 'T')).toLocaleDateString('pt-BR') } catch { return d }
  }

  return (
    <div>
      <div className="admin-row" style={{ gap: 12, marginBottom: 20 }}>
        <div className="admin-field" style={{ flex: 1 }}>
          <label>Pesquisar por nome, CPF ou ano</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite nome, CPF ou ano..."
          />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} style={{ alignSelf: 'flex-end' }}>Pesquisar</button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : alunos.length === 0 ? (
        <p className="admin-empty">Nenhum aluno encontrado.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Ano Letivo Atual</th>
              <th>Data de Nascimento</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id}>
                <td>{a.nome || '-'}</td>
                <td>{a.cpf || '-'}</td>
                <td>{a.ano_letivo_atual || '-'}</td>
                <td>{formatDate(a.data_nascimento)}</td>
                <td>{formatDate(a.created_at)}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => viewAluno(a.id)}>Ver</button>
                  <button className="btn btn-sm" onClick={() => onEdit(a.id)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteAluno(a.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showDetail && <AlunoDetail id={selectedId!} anexos={selectedAnexos} onClose={() => setShowDetail(false)} onNavigate={onNavigate} />}
    </div>
  )
}

function AlunoDetail({ id, anexos, onClose, onNavigate }: { id: string; anexos: any[]; onClose: () => void; onNavigate?: (view: string, section?: string, alunoId?: string) => void }) {
  const [aluno, setAluno] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/historico-alunos/${id}`).then(({ data }) => {
      setAluno(data.aluno)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const allCategorias = [...CATEGORIAS_ALUNO, ...CATEGORIAS_RESPONSAVEL]

  const getAnexosPorCategoria = (catKey: string) => anexos.filter((a) => a.categoria === catKey)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, maxWidth: 700, width: '100%',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Detalhes do Aluno</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm btn-primary" onClick={() => onNavigate?.('historico_editor', undefined, id)}>
              Histórico Escolar
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {loading ? <p>Carregando...</p> : aluno && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {CAMPOS_CADASTRO.filter((c) => aluno[c.key]).map((c) => (
                <div key={c.key} style={{ fontSize: '0.85rem' }}>
                  <strong>{c.label}:</strong> {c.key === 'data_nascimento' ? formatDateBR(aluno[c.key]) : aluno[c.key]}
                </div>
              ))}
            </div>

            {anexos.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 8 }}>Anexos</h4>
                {allCategorias.map((cat) => {
                  const items = getAnexosPorCategoria(cat.key)
                  if (items.length === 0) return null
                  return (
                    <div key={cat.key} style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                      <strong>{cat.label}:</strong>
                      {items.map((a: any) => (
                        <a
                          key={a.id}
                          href={a.data}
                          download={a.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ marginLeft: 8, color: 'var(--primary)' }}
                        >
                          {a.filename}
                        </a>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
