import { useState } from 'react'
import api from '../cms/api'
import { getUsernameFromToken } from '../cms/auth'

interface ChangePasswordModalProps {
  onSuccess: (newToken: string) => void
  onLogout: () => void
}

export default function ChangePasswordModal({ onSuccess, onLogout }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos')
      return
    }
    if (newPassword.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
      onSuccess(data.token)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.95)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32,
        maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ margin: '0 0 8px', color: 'var(--primary-dark)' }}>Alteração de Senha Obrigatória</h2>
        <p style={{ marginBottom: 20, fontSize: '0.85rem', color: 'var(--text-light)' }}>
          Sua senha foi resetada. Crie uma nova senha para continuar.
        </p>

        <form onSubmit={handleSubmit} data-lpignore="true" data-1p-ignore="true" data-bwignore="true">
          {/* Username real oculto (padrão oficial Chromium p/ troca de senha):
              permite ao Chrome associar a troca à conta correta sem o popup
              "Selecionar qual conta atualizar" */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue={getUsernameFromToken() || ''}
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="admin-field">
            <label>Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              id="current-password"
              name="current-password"
              autoComplete="current-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              required
            />
          </div>
          <div className="admin-field">
            <label>Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              id="new-password"
              name="new-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              required
              minLength={4}
            />
          </div>
          <div className="admin-field">
            <label>Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              required
              minLength={4}
            />
          </div>

          {error && <p className="admin-error" style={{ marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onLogout}>Sair</button>
          </div>
        </form>
      </div>
    </div>
  )
}
