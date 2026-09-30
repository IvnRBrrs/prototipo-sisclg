import { useState, useEffect } from 'react'
import api from '../cms/api'
import { getRoleFromToken, ROLE_NAMES, ROLES } from '../cms/auth'

interface SupabaseUser {
  id: string
  email: string
  role: string
  company_id?: string
  professor_id?: string
  created_at: string
  last_sign_in_at?: string
  confirmed_at?: string
}

export default function SupabaseUserManager() {
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState(ROLES.EDITOR_ADMIN)
  const [newProfessorId, setNewProfessorId] = useState('')
  const [newCompanyId, setNewCompanyId] = useState('default')
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; role: string; company_id: string; professor_id?: string } | null>(null)
  const [resetData, setResetData] = useState<{ id: string; email: string } | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isSuperAdmin = getRoleFromToken() === ROLES.SUPER_ADMIN

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    api.get('/professores').then(({ data }) => setProfessores(data)).catch(() => { })
  }, [])

  const loadUsers = async () => {
    setError('')
    try {
      const { data } = await api.get('/admin/supabase-users')
      setUsers(data)
    } catch (err: any) {
      if (users.length === 0) {
        setError(err.response?.data?.error || err.message || 'Erro ao carregar usuários do Supabase')
      }
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newEmail || !newPassword) return
    setStatus('')
    try {
      await api.post('/admin/supabase-users', {
        email: newEmail,
        password: newPassword,
        role: newRole,
        ...(isSuperAdmin ? { company_id: newCompanyId } : {}),
        professor_id: newRole === ROLES.PROFESSOR && newProfessorId ? newProfessorId : undefined,
      })
      setNewEmail('')
      setNewPassword('')
      setNewRole(ROLES.EDITOR_ADMIN)
      setNewProfessorId('')
      setNewCompanyId('default')
      setStatus('Usuário criado com sucesso no Supabase!')
      loadUsers()
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Erro ao criar')
    }
  }

  const saveUser = async (id: string, email: string, role: string, company_id: string, professor_id?: string) => {
    try {
      const payload: Record<string, string> = { email, role, company_id }
      if (role === ROLES.PROFESSOR) {
        payload.professor_id = professor_id || ''
      } else {
        payload.professor_id = ''
      }
      await api.put(`/admin/supabase-users/${id}`, payload)
      setEditingUser(null)
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Excluir este usuário do Supabase?')) return
    try {
      await api.delete(`/admin/supabase-users/${id}`)
      loadUsers()
    } catch { }
  }

  const resetPassword = async () => {
    if (!resetData || !tempPassword || tempPassword.length < 4) {
      alert('A senha deve ter pelo menos 4 caracteres')
      return
    }
    if (tempPassword !== confirmPassword) {
      alert('As senhas não conferem')
      return
    }
    try {
      await api.post(`/admin/supabase-users/${resetData.id}/reset-password`, { password: tempPassword })
      setResetData(null)
      setTempPassword('')
      setConfirmPassword('')
      alert(`Senha do usuário "${resetData.email}" redefinida com sucesso!`)
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao redefinir senha')
    }
  }

  function formatDate(d: string | undefined | null) {
    if (!d) return '-'
    try {
      const dt = new Date(d)
      return isNaN(dt.getTime()) ? d : dt.toLocaleString()
    } catch { return d }
  }

  const roleOptions = Object.entries(ROLE_NAMES)
    .filter(([value]) => isSuperAdmin || value !== ROLES.SUPER_ADMIN)
    .map(([value, label]) => (
      <option key={value} value={value}>{label}</option>
    ))

  return (
    <div className="admin-users">
      <h2>Gerenciar Usuários (Server S.)</h2>

      <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div className="admin-field">
          <label>E-mail</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@provedor.com" />
        </div>
        <div className="admin-field">
          <label>Senha</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="senha" autoComplete="new-password" />
        </div>
        <div className="admin-field">
          <label>Função</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {roleOptions}
          </select>
        </div>
        {newRole === ROLES.PROFESSOR && (
          <div className="admin-field">
            <label>Professor vinculado</label>
            <select value={newProfessorId} onChange={(e) => setNewProfessorId(e.target.value)}>
              <option value="">Nenhum</option>
              {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        )}
        {isSuperAdmin && (
          <div className="admin-field">
            <label>Empresa (company_id)</label>
            <input type="text" value={newCompanyId} onChange={(e) => setNewCompanyId(e.target.value)} placeholder="default" />
          </div>
        )}
        <button className="btn btn-primary" onClick={createUser}>Criar Usuário</button>
      </div>

      {status && <p style={{ marginBottom: 16, fontSize: '0.85rem' }}>{status}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 16 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>E-mail</th>
              <th>Função</th>
              <th>Professor</th>
              <th>Empresa</th>
              <th>Criado em</th>
              <th>Último acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isEditingThis = editingUser !== null && editingUser.id === u.id
              return (
                <tr key={u.id}>
                  <td style={{ fontSize: '0.75rem', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.id}</td>
                  <td>
                    {isEditingThis ? (
                      <input
                        type="email"
                        value={editingUser!.email}
                        onChange={(e) => setEditingUser({ ...editingUser!, email: e.target.value })}
                        style={{ width: '100%', minWidth: 200 }}
                      />
                    ) : (
                      u.email || '-'
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <select value={editingUser!.role} onChange={(e) => setEditingUser({ ...editingUser!, role: e.target.value })}>
                        {roleOptions}
                      </select>
                    ) : (
                      ROLE_NAMES[u.role] || u.role
                    )}
                  </td>
                  <td>
                    {isEditingThis && editingUser!.role === ROLES.PROFESSOR ? (
                      <select value={editingUser!.professor_id || ''} onChange={(e) => setEditingUser({ ...editingUser!, professor_id: e.target.value })}>
                        <option value="">Nenhum</option>
                        {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    ) : (
                      professores.find((p) => p.id === u.professor_id)?.nome || '-'
                    )}
                  </td>
                  <td>
                    {isEditingThis && isSuperAdmin ? (
                      <input
                        type="text"
                        value={editingUser!.company_id}
                        onChange={(e) => setEditingUser({ ...editingUser!, company_id: e.target.value })}
                        style={{ width: 100 }}
                      />
                    ) : (
                      u.company_id || '-'
                    )}
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDate(u.last_sign_in_at)}</td>
                  <td>
                    {isEditingThis ? (
                      <>
                        <button className="btn btn-sm" onClick={() => saveUser(u.id, editingUser!.email, editingUser!.role, editingUser!.company_id, editingUser!.professor_id)}>Salvar</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditingUser(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm" onClick={() => { setResetData(null); setEditingUser({ id: u.id, email: u.email, role: u.role, company_id: u.company_id || 'default', professor_id: u.professor_id || '' }) }}>Editar</button>
                        <button className="btn btn-sm" onClick={() => { setEditingUser(null); setResetData({ id: u.id, email: u.email }) }}>Resetar Senha</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Excluir</button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {resetData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.95)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 32,
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 8px' }}>Redefinir Senha (Supabase)</h3>
            <p style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Defina uma nova senha para <strong>{resetData.email}</strong>.
            </p>
            <div className="admin-field">
              <label>Nova Senha</label>
              <input
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="mín. 4 caracteres"
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            <div className="admin-field">
              <label>Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repita a senha"
                minLength={4}
                autoComplete="new-password"
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={resetPassword} disabled={tempPassword.length < 4 || tempPassword !== confirmPassword}>
                Redefinir
              </button>
              <button className="btn btn-outline" onClick={() => { setResetData(null); setTempPassword(''); setConfirmPassword('') }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
