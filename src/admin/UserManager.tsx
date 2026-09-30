import { useState, useEffect } from 'react'
import api from '../cms/api'
import { getRoleFromToken, ROLE_NAMES, ROLES } from '../cms/auth'
import { fetchUsersCached, invalidateCache, getCachedUsersSync } from '../cms/contentCache'

interface User {
  id: number | string
  username: string
  email: string
  role: string
  company_id?: string
  professor_id?: string
  created_at: string
  must_change_password?: number
}

interface UserManagerProps {
  currentUsername?: string
}

export default function UserManager({ currentUsername = '' }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>(() => getCachedUsersSync() || [])
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState(ROLES.EDITOR_ADMIN)
  const [newProfessorId, setNewProfessorId] = useState('')
  const [editingUser, setEditingUser] = useState<{ id: number | string; username: string; role: string; email: string; professor_id?: string } | null>(null)
  const [resetData, setResetData] = useState<{ id: number | string; username: string } | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(() => !getCachedUsersSync())
  const [error, setError] = useState('')

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    if (getRoleFromToken() === ROLES.SUPER_ADMIN || getRoleFromToken() === ROLES.GESTOR_ADMIN) {
      api.get('/professores').then(({ data }) => setProfessores(data)).catch(() => { })
    }
  }, [])

  const loadUsers = async () => {
    setError('')
    try {
      const { data } = await fetchUsersCached()
      setUsers(data)
    } catch (err: any) {
      if (users.length === 0) {
        setError(err.response?.data?.error || err.message || 'Erro ao carregar usuários')
      }
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUsername || !newPassword) return
    setStatus('')
    try {
      await api.post('/auth/users', {
        username: newUsername,
        password: newPassword,
        role: newRole,
        email: newEmail || undefined,
        professor_id: newRole === ROLES.PROFESSOR && newProfessorId ? newProfessorId : undefined,
      })
      setNewUsername('')
      setNewPassword('')
      setNewEmail('')
      setNewRole(ROLES.EDITOR_ADMIN)
      setNewProfessorId('')
      setStatus('Usuário criado com sucesso!')
      invalidateCache('users')
      loadUsers()
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Erro ao criar')
    }
  }

  const saveUser = async (id: number | string, username: string, role: string, email: string, professor_id?: string) => {
    try {
      const payload: Record<string, string> = { email }
      if (isSuperAdmin) {
        payload.username = username
        payload.role = role
      } else if (isGestorAdmin) {
        payload.role = role
      }
      // Vincular professor só faz sentido para o role professor;
      // ao trocar para outro role o vínculo é removido.
      if (role === ROLES.PROFESSOR) {
        payload.professor_id = professor_id || ''
      } else {
        payload.professor_id = ''
      }
      await api.put(`/auth/users/${id}`, payload)
      setEditingUser(null)
      invalidateCache('users')
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    }
  }

  const deleteUser = async (id: number | string) => {
    if (!confirm('Excluir este usuário?')) return
    try {
      await api.delete(`/auth/users/${id}`)
      invalidateCache('users')
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
      await api.post(`/auth/users/${resetData.id}/reset-password`, { password: tempPassword })
      setResetData(null)
      setTempPassword('')
      setConfirmPassword('')
      alert(`Senha do usuário "${resetData.username}" redefinida com sucesso!`)
      invalidateCache('users')
      loadUsers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao redefinir senha')
    }
  }

  function formatDate(d: string) {
    if (!d) return '-'
    try {
      const dt = new Date(d.replace(' ', 'T'))
      return isNaN(dt.getTime()) ? d : dt.toLocaleString()
    } catch { return d }
  }

  const roleFromToken = getRoleFromToken()
  const isSuperAdmin = roleFromToken === ROLES.SUPER_ADMIN
  const isGestorAdmin = roleFromToken === ROLES.GESTOR_ADMIN
  const canManageAll = isSuperAdmin || isGestorAdmin

  const roleOptions = Object.entries(ROLE_NAMES)
    .filter(([value]) => isSuperAdmin || value !== ROLES.SUPER_ADMIN)
    .map(([value, label]) => (
      <option key={value} value={value}>{label}</option>
    ))

  return (
    <div className="admin-users">
      <h2>{canManageAll ? 'Gerenciar Usuários (Turso)' : 'Meu Usuário'}</h2>

      {canManageAll && (
        <div className="admin-row" style={{ alignItems: 'flex-end', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div className="admin-field">
            <label>Nome de usuário</label>
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="usuário" />
          </div>
          <div className="admin-field">
            <label>Senha</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="senha" autoComplete="new-password" />
          </div>
          <div className="admin-field">
            <label>Email</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@provedor.com" />
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
          <button className="btn btn-primary" onClick={createUser}>Criar Usuário</button>
        </div>
      )}
      {status && <p style={{ marginBottom: 16, fontSize: '0.85rem' }}>{status}</p>}
      {error && <p className="admin-error" style={{ marginBottom: 16 }}>{error}</p>}
      {loading && <p>Carregando...</p>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuário</th>
              <th>Email</th>
              <th>Função</th>
              <th>Professor</th>
              <th>Empresa</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isEditingThis = editingUser !== null && editingUser.id === u.id
              const canEditRole = isSuperAdmin || isGestorAdmin
              return (
                <tr key={u.id}>
                  <td>{typeof u.id === 'string' ? u.id.substring(0, 8) + '...' : u.id}</td>
                  <td>
                    {isEditingThis && canEditRole ? (
                      <input
                        value={editingUser!.username}
                        onChange={(e) => setEditingUser({ ...editingUser!, username: e.target.value })}
                        style={{ width: '100%', minWidth: 140 }}
                      />
                    ) : (
                      <span>
                        {u.username}
                        {u.must_change_password === 1 && (
                          <span style={{
                            display: 'inline-block', marginLeft: 8, padding: '1px 6px',
                            fontSize: '0.7rem', borderRadius: 4,
                            background: '#fef3cd', color: '#856404', border: '1px solid #ffeeba',
                            fontWeight: 600,
                          }}>senha temporária</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditingThis ? (
                      <input
                        type="email"
                        value={editingUser!.email}
                        onChange={(e) => setEditingUser({ ...editingUser!, email: e.target.value })}
                        style={{ width: '100%', minWidth: 180 }}
                      />
                    ) : (
                      u.email || '-'
                    )}
                  </td>
                  <td>
                    {isEditingThis && canEditRole ? (
                      <select value={editingUser!.role} onChange={(e) => setEditingUser({ ...editingUser!, role: e.target.value })}>
                        {roleOptions}
                      </select>
                    ) : (
                      ROLE_NAMES[u.role] || u.role
                    )}
                  </td>
                  <td>
                    {isEditingThis && canEditRole && editingUser!.role === ROLES.PROFESSOR ? (
                      <select value={editingUser!.professor_id || ''} onChange={(e) => setEditingUser({ ...editingUser!, professor_id: e.target.value })}>
                        <option value="">Nenhum</option>
                        {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    ) : (
                      professores.find((p) => p.id === u.professor_id)?.nome || '-'
                    )}
                  </td>
                  <td>{u.company_id || '-'}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    {isEditingThis ? (
                      <>
                        <button className="btn btn-sm" onClick={() => saveUser(u.id, editingUser!.username, editingUser!.role, editingUser!.email, editingUser!.professor_id)}>Salvar</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditingUser(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        {canManageAll && (
                          <button className="btn btn-sm" onClick={() => { setResetData(null); setEditingUser({ id: u.id, username: u.username, role: u.role, email: u.email || '', professor_id: u.professor_id || '' }) }}>Editar</button>
                        )}
                        {(canManageAll || u.username === currentUsername) && (
                          <button className="btn btn-sm" onClick={() => { setEditingUser(null); setResetData({ id: u.id, username: u.username }) }}>Resetar Senha</button>
                        )}
                      </>
                    )}
                    {canManageAll && (
                      <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Excluir</button>
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
            <h3 style={{ margin: '0 0 8px' }}>Redefinir Senha</h3>
            <p style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Defina uma nova senha temporária para <strong>{resetData.username}</strong>.
              Este usuário precisará trocar a senha no próximo login.
            </p>
            <div className="admin-field">
              <label>Nova Senha Temporária</label>
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
