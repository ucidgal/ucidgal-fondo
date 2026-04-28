import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import Login         from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard     from './pages/Dashboard'
import Afiliados     from './pages/Afiliados'
import Cuotas        from './pages/Cuotas'
import Siniestros    from './pages/Siniestros'
import './index.css'

function Layout() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo" style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <img src="/logo.png" alt="UCIDGAL" style={{width:"36px",height:"36px",objectFit:"contain",flexShrink:0}} /><div><div className="sidebar-logo-name">Fondo de Decesos y Repatriación</div>
          <div className="sidebar-logo-sub">UCIDGAL · Galicia</div>
          <span className="sidebar-logo-badge">Administración</span></div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Principal</div>
          <NavLink to="/" end className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">▦</span> Panel general
          </NavLink>
          <NavLink to="/afiliados" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">◉</span> Afiliados
          </NavLink>
          <NavLink to="/cuotas" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">◈</span> Cuotas y pagos
          </NavLink>
          <NavLink to="/siniestros" className={({isActive}) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">◌</span> Fallecidos
          </NavLink>
        </div>

        <div style={{marginTop:'auto', padding:'1rem 1.25rem', borderTop:'1px solid var(--border)'}}>
          <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'8px'}}>{session.user.email}</div>
          <button className="btn btn-sm" style={{width:'100%',justifyContent:'center'}}
            onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/afiliados"  element={<Afiliados />} />
          <Route path="/cuotas"     element={<Cuotas />} />
          <Route path="/siniestros" element={<Siniestros />} />
        </Routes>
      </main>
    </div>
  )
}

function ProtectedApp() {
  const { loading, session } = useAuth()
  if (loading) return <div className="loading" style={{height:'100vh'}}><div className="spinner"/></div>

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/*"     element={<Layout />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
