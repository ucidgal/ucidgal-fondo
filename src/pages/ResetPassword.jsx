import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [ready, setReady]       = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  const subscriptionRef = useRef(null)

  useEffect(() => {
    async function verifyToken() {
      const hash   = window.location.hash.substring(1)
      const url    = new URL(window.location.href)
      const params = new URLSearchParams(hash || url.search)

      const tokenHash = params.get('token_hash') || params.get('access_token')
      const type      = params.get('type')

      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery'
        })
        if (error) {
          setError('Enlace inválido o expirado. Solicita un nuevo correo de recuperación.')
        } else {
          setReady(true)
        }
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setReady(true)
            subscription.unsubscribe()
          }
        })
        subscriptionRef.current = subscription

        timeoutRef.current = setTimeout(() => {
          setError(e => e || 'Enlace inválido o expirado. Solicita un nuevo correo de recuperación.')
        }, 5000)
      }
    }
    verifyToken()

    return () => {
      clearTimeout(timeoutRef.current)
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Error al actualizar: ' + error.message)
      setLoading(false)
    } else {
      setDone(true)
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Error al cerrar sesión:', err)
      }
      setTimeout(() => { navigate('/login') }, 2500)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-name">Fondo Islámico</div>
          <div className="login-logo-sub">Nueva contraseña</div>
        </div>

        {done && (
          <div className="alert alert-success">
            Contraseña actualizada. Redirigiendo al login...
          </div>
        )}

        {!done && error && !ready && (
          <div className="alert alert-error">{error}</div>
        )}

        {!done && !error && !ready && (
          <div className="loading"><div className="spinner"/><span>Verificando enlace...</span></div>
        )}

        {!done && ready && (
          <form onSubmit={handleReset}>
            {error && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{error}</div>}
            <div className="form-group" style={{marginBottom:'1rem'}}>
              <label className="form-label">Nueva contraseña</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required autoFocus autoComplete="new-password" />
            </div>
            <div className="form-group" style={{marginBottom:'1.5rem'}}>
              <label className="form-label">Confirmar contraseña</label>
              <input className="form-input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" required autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" type="submit"
              style={{width:'100%', justifyContent:'center'}} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        <p style={{fontSize:'11px', color:'var(--muted)', textAlign:'center', marginTop:'1.5rem'}}>
          <a href="/login" style={{color:'var(--muted)'}}>Volver al login</a>
        </p>
      </div>
    </div>
  )
}