import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ModalConfirmar from '../components/ModalConfirmar'

const ESTADO_CONFIG = {
  activo:          { label: 'Activos',           color: '#1A8FA6', bg: '#E8F8FC' },
  en_carencia:     { label: 'En carencia',        color: '#185FA5', bg: '#E6F1FB' },
  pendiente_pago:  { label: 'Pendiente pago',     color: '#633806', bg: '#FAEEDA' },
  baja_impago:     { label: 'Baja por impago',    color: '#791F1F', bg: '#FCEBEB' },
  baja_voluntaria: { label: 'Baja voluntaria',    color: '#5F5E5A', bg: '#F1F0EC' },
}

export default function Dashboard() {
  const [stats, setStats]             = useState({ afiliados: 0, activos: 0, cuotas: 0, siniestros: 0, gastos: 0 })
  const [provincias, setProvincias]   = useState([])
  const [estadosCounts, setEstados]   = useState([])
  const [recientes, setRecientes]     = useState([])
  const [impagados, setImpagados]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [bajando, setBajando]         = useState(false)
  const [confirmar, setConfirmar]     = useState(null)

  const anio = new Date().getFullYear()
  const hoy  = new Date()

  const fetchData = useCallback(async () => {
    const [
      { count: total },
      { count: activos },
      cuotasRes,
      sinRes,
      gastosRes,
      afsEstadoRes,
      sinTotalRes,
    ] = await Promise.all([
      supabase.from('afiliados').select('*', { count: 'exact', head: true }),
      supabase.from('afiliados_estado_real').select('*', { count: 'exact', head: true }).eq('estado_calculado', 'activo'),
      supabase.from('cuotas').select('importe').eq('estado', 'pagado').eq('anio', anio),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'procesando']),
      supabase.from('siniestros').select('gasto_total, created_at').not('gasto_total', 'is', null),
      supabase.from('afiliados_estado_real').select('estado_calculado, estado'),
      supabase.from('siniestros').select('*', { count: 'exact', head: true }),
    ])

    const totalCuotas = (cuotasRes.data || []).reduce((s, c) => s + Number(c.importe), 0)
    const totalGastos = (gastosRes.data || []).filter(s => s.created_at && new Date(s.created_at).getFullYear() === anio).reduce((s, s2) => s + Number(s2.gasto_total || 0), 0)

    setStats({
      afiliados: total || 0,
      activos:   activos || 0,
      cuotas:    totalCuotas,
      siniestros: sinRes.count || 0,
      sinistrosTotal: sinTotalRes?.count || 0,
      gastos:    totalGastos,
    })

    // Estados de afiliados
    const emap = {}
    ;(afsEstadoRes.data || []).forEach(a => {
      const est = a.estado_calculado || a.estado || 'pendiente_pago'
      emap[est] = (emap[est] || 0) + 1
    })
    const estadosOrden = ['activo','en_carencia','pendiente_pago','baja_impago','baja_voluntaria']
    const max = Math.max(...Object.values(emap), 1)
    setEstados(estadosOrden
      .filter(e => emap[e] > 0)
      .map(e => ({ e, n: emap[e], pct: Math.round((emap[e] / max) * 100) }))
    )

    // Por provincia
    const { data: afs } = await supabase.from('afiliados').select('provincia')
    const pmap = {}
    ;(afs || []).forEach(a => { pmap[a.provincia] = (pmap[a.provincia] || 0) + 1 })
    const sorted = Object.entries(pmap).sort((a, b) => b[1] - a[1])
    const maxP = sorted[0]?.[1] || 1
    setProvincias(sorted.map(([p, n]) => ({ p, n, pct: Math.round((n / maxP) * 100) })))

    // Siniestros recientes
    const { data: sins } = await supabase
      .from('siniestros').select('num_expediente, nombre_fallecido, tipo_servicio, estado, gasto_total')
      .order('created_at', { ascending: false }).limit(5)
    setRecientes(sins || [])

    // Impagados
    const { data: afsActivos } = await supabase
      .from('afiliados').select('id, nombre, apellidos, num_inscripcion').eq('estado', 'activo')
    const { data: cuotasPagadas } = await supabase
      .from('cuotas').select('afiliado_id').eq('estado', 'pagado').eq('anio', anio)
    const pagadosIds = new Set((cuotasPagadas || []).map(c => c.afiliado_id))
    setImpagados((afsActivos || []).filter(a => !pagadosIds.has(a.id)))

    setLoading(false)
  }, [anio])

  useEffect(() => { fetchData() }, [fetchData])

  async function ejecutarBajaMasiva() {
    setBajando(true)
    const ids = impagados.map(a => a.id)
    await supabase.from('afiliados').update({ estado: 'baja_impago', updated_at: new Date().toISOString() }).in('id', ids)
    await fetchData()
    setBajando(false)
  }

  function darBajaMasiva() {
    setConfirmar({
      titulo: 'Dar de baja por impago',
      mensaje: `¿Confirmas que deseas dar de baja a ${impagados.length} afiliado(s) que no han pagado la cuota ${anio}? Esta acción no se puede deshacer.`,
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

      {/* Stats principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total afiliados activos</div>
          <div className="stat-value">{stats.activos} <span style={{fontSize:'14px',fontWeight:400,color:'var(--muted)'}}>/ {stats.afiliados}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cuotas cobradas {anio}</div>
          <div className="stat-value">{stats.cuotas.toLocaleString('es-ES')}€</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Siniestros abiertos en tramitación</div>
          <div className="stat-value">{stats.siniestros} <span style={{fontSize:'14px',fontWeight:400,color:'var(--muted)'}}>/ {stats.sinistrosTotal}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gastos totales expedientes {anio}</div>
          <div className="stat-value">{stats.gastos.toLocaleString('es-ES')}€</div>
        </div>
      </div>

      {/* Fila principal */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>

        {/* Afiliados por estado */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Afiliados por estado</span>
          </div>
          <div className="card-body">
            {estadosCounts.length === 0
              ? <p style={{color:'var(--muted)',fontSize:'13px'}}>Sin datos todavía.</p>
              : estadosCounts.map(({e, n, pct}) => {
                  const cfg = ESTADO_CONFIG[e] || { label: e, color: 'var(--muted)', bg: 'var(--bg)' }
                  return (
                    <div key={e} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                      <div style={{width:'110px',fontSize:'11px',fontWeight:500,color:cfg.color,textAlign:'right',flexShrink:0}}>{cfg.label}</div>
                      <div style={{flex:1,height:'16px',background:'var(--bg)',borderRadius:'4px',overflow:'hidden'}}>
                        <div style={{height:'100%',background:cfg.color,borderRadius:'4px',width:pct+'%',transition:'width 0.4s ease'}}/>
                      </div>
                      <div style={{width:'28px',fontSize:'12px',fontWeight:500,color:'var(--text)'}}>{n}</div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Afiliados por provincia */}
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
      </div>

      {/* Siniestros recientes */}
      <div className="card">
        <div className="card-header"><span className="card-title">Expedientes recientes</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Expediente</th><th>Fallecido</th><th>Tipo</th><th>Gasto</th><th>Estado</th></tr></thead>
            <tbody>
              {recientes.length === 0
                ? <tr><td colSpan={5} style={{color:'var(--muted)',textAlign:'center'}}>Sin expedientes registrados.</td></tr>
                : recientes.map(s => (
                  <tr key={s.num_expediente}>
                    <td className="mono">{s.num_expediente}</td>
                    <td style={{fontWeight:500}}>{s.nombre_fallecido}</td>
                    <td style={{color:'var(--muted)',fontSize:'12px'}}>{s.tipo_servicio === 'repatriacion' ? 'Repatriación' : 'Entierro local'}</td>
                    <td style={{fontWeight:500,color: s.gasto_total ? 'var(--text)' : 'var(--muted)'}}>
                      {s.gasto_total ? Number(s.gasto_total).toLocaleString('es-ES') + '€' : '—'}
                    </td>
                    <td><span className={`badge badge-${s.estado}`}>{s.estado}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
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
