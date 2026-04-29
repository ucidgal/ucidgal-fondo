import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import Login         from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard     from './pages/Dashboard'
import Afiliados     from './pages/Afiliados'
import Cuotas        from './pages/Cuotas'
import Siniestros    from './pages/Siniestros'
import BuscadorGlobal from './components/BuscadorGlobal'
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

        <div style={{padding:'0.75rem 1rem', borderTop:'1px solid var(--border)'}}>
          <BuscadorGlobal />
        </div>

        <div style={{padding:'0.75rem 1.25rem 1rem', borderTop:'1px solid var(--border)'}}>
          <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'8px'}}>{session.user.email}</div>
          <button className="btn btn-sm" style={{width:'100%',justifyContent:'center'}}
            onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="mobile-header">
        <img src="/logo.png" alt="UCIDGAL" style={{width:'28px',height:'28px',objectFit:'contain',flexShrink:0}} />
        <div style={{flex:1,minWidth:0}}>
          <BuscadorGlobal />
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/afiliados"  element={<Afiliados />} />
          <Route path="/cuotas"     element={<Cuotas />} />
          <Route path="/siniestros" element={<Siniestros />} />
        </Routes>
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({isActive}) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <svg className="bnav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1h-4v-4H8v4H4a1 1 0 01-1-1V9.5z"/></svg>
          Panel
        </NavLink>
        <NavLink to="/afiliados" className={({isActive}) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <svg className="bnav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z"/></svg>
          Afiliados
        </NavLink>
        <NavLink to="/cuotas" className={({isActive}) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <svg className="bnav-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm-2 5v5a2 2 0 002 2h12a2 2 0 002-2V9H2zm3 3h2a1 1 0 010 2H5a1 1 0 010-2z"/></svg>
          Cuotas
        </NavLink>
        <NavLink to="/siniestros" className={({isActive}) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
          <svg className="bnav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
          Fallecidos
        </NavLink>
        <button className="bottom-nav-item" onClick={() => supabase.auth.signOut()}>
          <svg className="bnav-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 100-2H4V5h6a1 1 0 100-2H3zm11.293 4.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-2 2a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          Salir
        </button>
      </nav>
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
