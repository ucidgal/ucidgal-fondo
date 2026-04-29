import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ModalConfirmar from '../components/ModalConfirmar'

export default function Dashboard() {
  const [stats, setStats]           = useState({ afiliados: 0, activos: 0, cuotas: 0, siniestros: 0 })
  const [provincias, setProvincias] = useState([])
  const [recientes, setRecientes]   = useState([])
  const [alertas, setAlertas]       = useState([])
  const [impagados, setImpagados]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [bajando, setBajando]       = useState(false)
  const [confirmar, setConfirmar]   = useState(null)

  const anio = new Date().getFullYear()
  const hoy  = new Date()
  const fueraPlazo = hoy.getMonth() >= 2 // marzo en adelante

  const fetchData = useCallback(async () => {
    const [{ count: total }, { count: activos }, cuotasRes, sinRes] = await Promise.all([
      supabase.from('afiliados').select('*', { count: 'exact', head: true }),
      supabase.from('afiliados').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('cuotas').select('importe').eq('estado', 'pagado').eq('anio', anio),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'procesando']),
    ])
    const totalCuotas = (cuotasRes.data || []).reduce((s, c) => s + Number(c.importe), 0)
    setStats({ afiliados: total || 0, activos: activos || 0, cuotas: totalCuotas, siniestros: sinRes.count || 0 })

    const { data: afs } = await supabase.from('afiliados').select('provincia')
    const pmap = {}
    ;(afs || []).forEach(a => { pmap[a.provincia] = (pmap[a.provincia] || 0) + 1 })
    const sorted = Object.entries(pmap).sort((a, b) => b[1] - a[1])
    const max = sorted[0]?.[1] || 1
    setProvincias(sorted.map(([p, n]) => ({ p, n, pct: Math.round((n / max) * 100) })))

    const { data: sins } = await supabase
      .from('siniestros').select('num_expediente, nombre_fallecido, tipo_servicio, estado, created_at')
      .order('created_at', { ascending: false }).limit(5)
    setRecientes(sins || [])

    // Afiliados activos SIN cuota pagada este año → impagados
    const { data: afsActivos } = await supabase
      .from('afiliados').select('id, nombre, apellidos, num_inscripcion').eq('estado', 'activo')
    const { data: cuotasPagadas } = await supabase
      .from('cuotas').select('afiliado_id').eq('estado', 'pagado').eq('anio', anio)
    const pagadosIds = new Set((cuotasPagadas || []).map(c => c.afiliado_id))
    const sinPagar = (afsActivos || []).filter(a => !pagadosIds.has(a.id))
    setImpagados(sinPagar)

    const msgs = []
    if (sinPagar.length > 0 && fueraPlazo)
      msgs.push({ tipo: 'error', txt: `${sinPagar.length} afiliado(s) activos no han pagado la cuota ${anio} y el plazo de renovación (enero–febrero) ha vencido.` })
    else if (sinPagar.length > 0)
      msgs.push({ tipo: 'warn', txt: `${sinPagar.length} afiliado(s) activos aún no han pagado la cuota ${anio}. El plazo vence el 28 de febrero.` })
    setAlertas(msgs)
    setLoading(false)
  }, [anio, fueraPlazo])

  useEffect(() => { fetchData() }, [fetchData])

  async function ejecutarBajaMasiva() {
    setBajando(true)
    const ids = impagados.map(a => a.id)
    await supabase.from('afiliados').update({ estado: 'baja', updated_at: new Date().toISOString() }).in('id', ids)
    await fetchData()
    setBajando(false)
  }

  function darBajaMasiva() {
    setConfirmar({
      titulo: 'Dar de baja por impago',
      mensaje: `¿Confirmas que deseas dar de baja a ${impagados.length} afiliado(s) que no han pagado la cuota ${new Date().getFullYear()}? Esta acción no se puede deshacer.`,
      labelConfirmar: `Dar de baja (${impagados.length})`,
      tipo: 'danger',
      accion: ejecutarBajaMasiva
    })
  }

  if (loading) return <div className="loading"><div className="spinner"/><span>Cargando panel...</span></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Panel general</div>
        <div className="page-subtitle">Resumen del Fondo · {hoy.toLocaleDateString('es-ES', { year:'numeric', month:'long', day:'numeric' })}</div>
      </div>

      {alertas.map((a, i) => (
        <div key={i} className={`alert alert-${a.tipo}`} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
          <span>{a.txt}</span>
          {a.tipo === 'error' && impagados.length > 0 && (
            <button className="btn btn-sm btn-danger" onClick={darBajaMasiva} disabled={bajando} style={{flexShrink:0}}>
              {bajando ? 'Procesando...' : `Dar de baja (${impagados.length})`}
            </button>
          )}
        </div>
      ))}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total afiliados</div>
          <div className="stat-value">{stats.afiliados}</div>
          <div className="stat-sub">{stats.activos} activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cuotas cobradas {anio}</div>
          <div className="stat-value">{stats.cuotas.toLocaleString('es-ES')}€</div>
          <div className="stat-sub">{impagados.length} sin pagar</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Siniestros abiertos</div>
          <div className="stat-value">{stats.siniestros}</div>
          <div className="stat-sub">En tramitación</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Renovación</div>
          <div className="stat-value">{anio}</div>
          <div className="stat-sub">{fueraPlazo ? 'Plazo vencido' : 'Plazo: ene–feb'}</div>
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
                  ? <tr><td colSpan={3} style={{color:'var(--muted)',textAlign:'center'}}>Sin siniestros registrados.</td></tr>
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
    <ModalConfirmar
        config={confirmar}
        onConfirmar={() => { confirmar?.accion(); setConfirmar(null) }}
        onCancelar={() => setConfirmar(null)}
      />
    </div>
  )
}
