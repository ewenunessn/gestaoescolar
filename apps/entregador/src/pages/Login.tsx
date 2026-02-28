import { useState } from 'react'
import { login } from '../api/auth'
import { useNavigate } from 'react-router-dom'
import { handleAxiosError } from '../api/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setLoading(true)
      await login(email, senha)
      navigate('/rotas', { replace: true })
    } catch (e) {
      setError(handleAxiosError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Acesso do Entregador</h2>
        {error && <div className="card error" style={{ marginBottom: 8 }}>{error}</div>}
        <form onSubmit={onSubmit} style={{ display:'grid', gap:10 }}>
          <label>
            E-mail
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            Senha
            <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </label>
          <button className="btn" disabled={loading} type="submit">{loading ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  )
}
