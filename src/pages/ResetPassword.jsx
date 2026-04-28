import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    // Supabase envía el token como hash en la URL: #access_token=...&type=recovery
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      // supabase-js lo procesa automáticamente al detectar el hash
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true)
        }
      })
    } else {
      setError('Enlace inválido o expirado. Solicita un nuevo correo de recuperación.')
    }
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Error al actualizar: ' + error.message)
    } else {
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => { window.location.href = '/login' }, 2500)
    }
    setLoading(false)
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
            Contraseña actualizada correctamente. Redirigiendo al login...
          </div>
        )}

        {!done && error && !ready && (
          <div className="alert alert-error">{error}</div>
        )}

        {!done && ready && (
          <form onSubmit={handleReset}>
            {error && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{error}</div>}
            <div className="form-group" style={{marginBottom:'1rem'}}>
              <label className="form-label">Nueva contraseña</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="form-group" style={{marginBottom:'1.5rem'}}>
              <label className="form-label">Confirmar contraseña</label>
              <input
                className="form-input"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        {!done && !ready && !error && (
          <div className="loading"><div className="spinner"/><span>Verificando enlace...</span></div>
        )}

        <p style={{fontSize:'11px',color:'var(--muted)',textAlign:'center',marginTop:'1.5rem'}}>
          <a href="/login" style={{color:'var(--muted)'}}>Volver al login</a>
        </p>
      </div>
    </div>
  )
}
