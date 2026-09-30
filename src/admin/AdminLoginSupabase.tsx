import { useState } from 'react'
import { supabase } from '../cms/supabaseClient'

interface AdminLoginSupabaseProps {
  onLogin: (token: string, mustChangePassword?: boolean) => void
  onBack: () => void
}

export default function AdminLoginSupabase({ onLogin, onBack }: AdminLoginSupabaseProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      if (!data.session) throw new Error('No session returned')

      const token = data.session.access_token
      localStorage.setItem('supabase_token', token)
      console.log('[Supbs] Login bem-sucedido via Supbs Auth')
      onLogin(token)
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar via Supbs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <h1 style={{ textAlign: 'center' }}>Colégio São Judas Tadeu</h1>
        <p className="admin-login-sub" style={{ textAlign: 'center' }}>
          Login via Server S. (experimental)
        </p>
        <form onSubmit={handleLogin} data-lpignore="true" data-1p-ignore="true" data-bwignore="true">
          <div className="admin-field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              name="username"
              autoComplete="username"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              required
            />
          </div>
          <div className="admin-field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="current-password"
              autoComplete="current-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              required
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.85rem' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Voltar ao login padrão
          </button>
        </p>
      </div>
    </div>
  )
}
