import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats]       = useState({ afiliados: 0, activos: 0, cuotas: 0, siniestros: 0 })
  const [provincias, setProvincias] = useState([])
  const [recientes, setRecientes]   = useState([])
  const [alertas, setAlertas]       = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ count: total }, { count: activos }, cuotasRes, sinRes] = await Promise.all([
      supabase.from('afiliados').select('*', { count: 'exact', head: true }),
      supabase.from('afiliados').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('cuotas').select('importe').eq('estado', 'pagado').eq('anio', new Date().getFullYear()),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'procesando']),
    ])

    const totalCuotas = (cuotasRes.data || []).reduce((s, c) => s + Number(c.importe), 0)

    setStats({
      afiliados: total || 0,
      activos:   activos || 0,
      cuotas:    totalCuotas,
      siniestros: sinRes.count || 0
    })

    // Por provincia
    const { data: afs } = await supabase.from('afiliados').select('provincia')
    const pmap = {}
    ;(afs || []).forEach(a => { pmap[a.provincia] = (pmap[a.provincia] || 0) + 1 })
    const sorted = Object.entries(pmap).sort((a, b) => b[1] - a[1])
    const max = sorted[0]?.[1] || 1
    setProvincias(sorted.map(([p, n]) => ({ p, n, pct: Math.round((n / max) * 100) })))

    // Siniestros recientes
    const { data: sins } = await supabase
      .from('siniestros')
      .select('num_expediente, nombre_fallecido, tipo_servicio, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    setRecientes(sins || [])

    // Alertas: cuotas pendientes este año
    const { count: pendientes } = await supabase
      .from('cuotas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .eq('anio', new Date().getFullYear())
    if (pendientes > 0) setAlertas([`Hay ${pendientes} afiliado(s) con cuota pendiente de pago en ${new Date().getFullYear()}.`])

    setLoading(false)
  }

  if (loading) return <div className="loading"><div className="spinner"/><span>Cargando panel...</span></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Panel general</div>
        <div className="page-subtitle">Resumen del Fondo · {new Date().toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' })}</div>
      </div>

      {alertas.map((a, i) => <div key={i} className="alert alert-warn">{a}</div>)}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total afiliados</div>
          <div className="stat-value">{stats.afiliados}</div>
          <div className="stat-sub">{stats.activos} activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cuotas cobradas {new Date().getFullYear()}</div>
          <div className="stat-value">{stats.cuotas.toLocaleString('es-ES')}€</div>
          <div className="stat-sub">Año en curso</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Siniestros abiertos</div>
          <div className="stat-value">{stats.siniestros}</div>
          <div className="stat-sub">En tramitación</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Año activo</div>
          <div className="stat-value">{new Date().getFullYear()}</div>
          <div className="stat-sub">Renovación: ene–feb</div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
        <div className="card">
          <div className="card-header"><span className="card-title">Afiliados por provincia</span></div>
          <div className="card-body">
            {provincias.length === 0
              ? <p style={{color:'var(--muted)',fontSize:'13px'}}>Sin datos todavía.</p>
              : provincias.map(({p, n, pct}) => (
                <div className="chart-row" key={p}>
                  <div className="chart-lbl">{p || 'Sin asignar'}</div>
                  <div className="chart-bg"><div className="chart-fill" style={{width: pct+'%'}}/></div>
                  <div className="chart-val">{n}</div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Siniestros recientes</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Expediente</th><th>Fallecido</th><th>Estado</th></tr></thead>
              <tbody>
                {recientes.length === 0
                  ? <tr><td colSpan={3} style={{color:'var(--muted)', textAlign:'center'}}>Sin siniestros registrados.</td></tr>
                  : recientes.map(s => (
                    <tr key={s.num_expediente}>
                      <td className="mono">{s.num_expediente}</td>
                      <td>{s.nombre_fallecido}</td>
                      <td><span className={`badge badge-${s.estado}`}>{s.estado}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
