import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><img src="/logo.png" alt="UCIDGAL" style={{width:"64px",height:"64px",objectFit:"contain",marginBottom:"12px"}} />
          <div className="login-logo-name">Fondo Islámico</div>
          <div className="login-logo-sub">Unión de Comunidades Islámicas de Galicia</div>
          <span className="login-badge">Panel de administración</span>
        </div>

        {error && <div className="alert alert-error" style={{marginBottom:'1.25rem'}}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{marginBottom:'1rem'}}>
            <label className="form-label">Email de administrador</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ucidgal.org"
              required
            />
          </div>
          <div className="form-group" style={{marginBottom:'1.5rem'}}>
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
            {loading ? 'Accediendo...' : 'Acceder'}
          </button>
        </form>

        <p style={{fontSize:'11px',color:'var(--muted)',textAlign:'center',marginTop:'1.5rem'}}>
          Acceso restringido · UCIDGAL · Galicia, España
        </p>
      </div>
    </div>
  )
}
