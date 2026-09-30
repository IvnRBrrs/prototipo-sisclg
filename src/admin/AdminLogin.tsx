import { useState } from 'react'
import { login } from '../cms/api'
import api from '../cms/api'

interface AdminLoginProps {
  onLogin: (token: string, mustChangePassword?: boolean) => void
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupStatus, setSetupStatus] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(username, password)
      localStorage.setItem('cms_token', res.token)
      onLogin(res.token, res.mustChangePassword)
    } catch {
      setError('Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupStatus('')
    setLoading(true)
    try {
      await api.post('/auth/setup', { username, password })
      setSetupStatus('Usuário criado! Faça login.')
      setMode('login')
    } catch (err: any) {
      setSetupStatus(err.response?.data?.error || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1 style={{ textAlign: 'center' }}>Colégio São Judas Tadeu</h1>

        {mode === 'login' ? (
          <>
            <p className="admin-login-sub" style={{ textAlign: 'center' }}>Faça login para acessar o sistema</p>
            <form onSubmit={handleLogin} data-lpignore="true" data-1p-ignore="true" data-bwignore="true">
              <div className="admin-field">
                <label>Usuário</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} name="username" autoComplete="username" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" required />
              </div>
              <div className="admin-field">
                <label>Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} name="password" autoComplete="current-password" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" required />
              </div>
              {error && <p className="admin-error">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem' }}>
              <button onClick={() => window.location.href = '/'} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                Voltar ao Site
              </button>
            </p>
            {/* <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem' }}>
              <button onClick={() => { setMode('setup'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                Primeiro acesso? Criar usuário admin
              </button>
            </p> */}
          </>
        ) : (
          <>
            {/* <p className="admin-login-sub">Crie o usuário administrador (apenas no primeiro acesso).</p>
            <form onSubmit={handleSetup}>
              <div className="admin-field">
                <label>Usuário</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="admin-field">
                <label>Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {setupStatus && <p className={setupStatus.includes('Erro') ? 'admin-error' : ''} style={{ fontSize: '0.85rem', marginBottom: 12 }}>{setupStatus}</p>}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </button>
            </form>
            <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem' }}>
              <button onClick={() => { setMode('login'); setSetupStatus('') }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                Voltar para login
              </button>
            </p> */}
          </>
        )}
      </div>
    </div>
  )
}
