import { useState, useEffect } from 'react'
import { fetchOrganizations, createOrganization, updateOrganization, runOnboarding, type Organization } from '../cms/api'

interface OrganizationsManagerProps {
  onEnterCompany: (companyId: string) => void
}

const statusColor = (s: string) => s === 'active' ? '#16a34a' : '#b45309'

export default function OrganizationsManager({ onEnterCompany }: OrganizationsManagerProps) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [newSlug, setNewSlug] = useState('')
  const [newNome, setNewNome] = useState('')
  const [newDomains, setNewDomains] = useState('')
  const [creating, setCreating] = useState(false)

  const [editing, setEditing] = useState<{ id: string; nome: string; domains: string; status: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [onboardingOrg, setOnboardingOrg] = useState<Organization | null>(null)
  const [onbUsername, setOnbUsername] = useState('')
  const [onbPassword, setOnbPassword] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [onbError, setOnbError] = useState('')
  const [onbResult, setOnbResult] = useState<any>(null)

  useEffect(() => { loadOrgs() }, [])

  const loadOrgs = async () => {
    setError('')
    try {
      const data = await fetchOrganizations()
      setOrgs(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar organizações')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    const slug = newSlug.trim()
    if (!slug || !newNome.trim()) {
      setStatus('Preencha o identificador (slug) e o nome da organização.')
      return
    }
    setStatus('')
    setCreating(true)
    try {
      const domains = newDomains
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
      await createOrganization({ slug, nome: newNome.trim(), domains })
      setNewSlug('')
      setNewNome('')
      setNewDomains('')
      setStatus(`Organização "${slug}" criada!`)
      await loadOrgs()
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Erro ao criar organização')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    setStatus('')
    try {
      const domains = editing.domains
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
      await updateOrganization(editing.id, { nome: editing.nome.trim(), domains, status: editing.status })
      setEditing(null)
      setStatus(`Organização "${editing.id}" atualizada!`)
      await loadOrgs()
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Erro ao salvar alterações')
    } finally {
      setSavingEdit(false)
    }
  }

  const openOnboarding = (o: Organization) => {
    setOnboardingOrg(o)
    setOnbUsername('')
    setOnbPassword('')
    setOnbError('')
    setOnbResult(null)
  }

  const handleRunOnboarding = async () => {
    if (!onboardingOrg) return
    if (onbPassword && onbPassword.length < 4) {
      setOnbError('A senha deve ter pelo menos 4 caracteres.')
      return
    }
    setOnbError('')
    setProvisioning(true)
    try {
      const payload: { admin_username?: string; admin_password?: string } = {}
      if (onbUsername.trim()) payload.admin_username = onbUsername.trim()
      if (onbPassword) payload.admin_password = onbPassword
      const result = await runOnboarding(onboardingOrg.id, payload)
      setOnbResult(result)
      await loadOrgs()
    } catch (err: any) {
      setOnbError(err.response?.data?.error || 'Erro ao provisionar a organização')
    } finally {
      setProvisioning(false)
    }
  }

  const closeOnboarding = () => {
    setOnboardingOrg(null)
    setOnbResult(null)
    setOnbError('')
  }

  return (
    <div className="admin-orgs">
      <h2>Organizações</h2>
      <p className="admin-hint" style={{ marginTop: 0, marginBottom: 20, fontSize: '0.85rem', color: 'var(--text-light)' }}>
        Cada organização é uma escola independente, com seu próprio conteúdo, páginas, usuários e dados.
        Clique em <strong>Entrar</strong> para abrir o painel completo da organização.
      </p>

      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div className="admin-field">
          <label>Identificador (company_id)</label>
          <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="ex.: colegio-novo" />
        </div>
        <div className="admin-field">
          <label>Nome</label>
          <input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="ex.: Colégio Novo" />
        </div>
        <div className="admin-field" style={{ flex: 1, minWidth: 220 }}>
          <label>Domínios (separados por vírgula)</label>
          <input value={newDomains} onChange={(e) => setNewDomains(e.target.value)} placeholder="opcional — ex.: colegionovo.com.br" />
        </div>
        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          {creating ? 'Criando...' : 'Criar Organização'}
        </button>
      </div>

      {status && <p style={{ marginBottom: 16, fontSize: '0.85rem' }}>{status}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 16 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>company_id</th>
              <th>Nome</th>
              <th>Domínios</th>
              <th>Status</th>
              <th>Criada em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => {
              const isEditingThis = editing !== null && editing.id === o.id
              return (
                <tr key={o.id}>
                  <td>
                    <code>{o.id}</code>
                  </td>
                  <td>
                    {isEditingThis ? (
                      <input value={editing!.nome} onChange={(e) => setEditing({ ...editing!, nome: e.target.value })} style={{ width: '100%', minWidth: 160 }} />
                    ) : (
                      o.nome
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <input value={editing!.domains} onChange={(e) => setEditing({ ...editing!, domains: e.target.value })} placeholder="domínios separados por vírgula" style={{ width: '100%', minWidth: 200 }} />
                    ) : (
                      o.domains && o.domains.length > 0 ? o.domains.join(', ') : '-'
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <select value={editing!.status} onChange={(e) => setEditing({ ...editing!, status: e.target.value })}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    ) : (
                      <span style={{ color: statusColor(o.status), fontWeight: 600 }}>{o.status}</span>
                    )}
                  </td>
                  <td>{o.created_at ? o.created_at.slice(0, 10) : '-'}</td>
                  <td>
                    {isEditingThis ? (
                      <>
                        <button className="btn btn-sm" onClick={handleSaveEdit} disabled={savingEdit}>
                          {savingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditing(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm" onClick={() => setEditing({ id: o.id, nome: o.nome, domains: o.domains ? o.domains.join(', ') : '', status: o.status })}>Editar</button>
                        <button className="btn btn-sm btn-primary" onClick={() => onEnterCompany(o.id)}>Entrar</button>
                        {o.provisioned ? (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginLeft: 4 }}>✓ Template aplicado</span>
                        ) : (
                          <button className="btn btn-sm btn-outline" onClick={() => openOnboarding(o)}>Provisionar</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {onboardingOrg && (
        <div className="admin-modal-overlay" onClick={closeOnboarding}>
          <div className="admin-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="admin-modal-close" onClick={closeOnboarding}>&times;</button>
            {onbResult ? (
              <div>
                <h3 style={{ margin: '0 0 12px' }}>Organização provisionada!</h3>
                <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 16px' }}>
                  <strong>Importante:</strong> guarde as credenciais abaixo — a senha é exibida apenas esta vez.
                  O usuário precisará trocá-la no primeiro login.
                </p>
                <div className="msg-modal-details">
                  <div className="msg-modal-row"><span className="msg-modal-label">Usuário</span><span><code>{onbResult.username}</code></span></div>
                  <div className="msg-modal-row"><span className="msg-modal-label">Senha</span><span><code>{onbResult.password}</code></span></div>
                  <div className="msg-modal-row"><span className="msg-modal-label">Email</span><span>{onbResult.email}</span></div>
                  <div className="msg-modal-row">
                    <span className="msg-modal-label">Supabase</span>
                    <span style={{ color: onbResult.supabase?.ok ? '#16a34a' : '#b45309' }}>
                      {onbResult.supabase?.ok ? 'usuário criado ✓' : `falhou: ${onbResult.supabase?.error || 'não configurado'}`}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '12px 0 16px' }}>
                  Copiado do template: {onbResult.copied?.pages} páginas, {onbResult.copied?.page_content} conteúdos de página,{' '}
                  {onbResult.copied?.content} conteúdos globais, {onbResult.copied?.images} imagens, {onbResult.copied?.blog_posts} posts do blog.
                </p>
                <button className="btn btn-primary" onClick={closeOnboarding}>Fechar</button>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 8px' }}>Provisionar "{onboardingOrg.id}"</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 16px' }}>
                  Copia para esta organização o template da <strong>Default</strong> (páginas, conteúdos, biblioteca de imagens
                  e posts do blog) e cria o usuário administrador <strong>no Turso e no Supabase</strong>.
                  Esta ação pode ser executada <strong>uma única vez</strong> por organização.
                </p>
                <div className="admin-field">
                  <label>Usuário admin (opcional)</label>
                  <input value={onbUsername} onChange={(e) => setOnbUsername(e.target.value)} placeholder={`padrão: ${onboardingOrg.id}_admin`} autoComplete="off" />
                </div>
                <div className="admin-field">
                  <label>Senha admin (opcional — mín. 4 caracteres)</label>
                  <input type="password" value={onbPassword} onChange={(e) => setOnbPassword(e.target.value)} placeholder="vazio = senha gerada automaticamente" autoComplete="new-password" />
                </div>
                {onbError && <p className="admin-error" style={{ marginBottom: 12 }}>{onbError}</p>}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={handleRunOnboarding} disabled={provisioning}>
                    {provisioning ? 'Provisionando...' : 'Provisionar'}
                  </button>
                  <button className="btn btn-outline" onClick={closeOnboarding}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
