import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ANIO_ACTUAL = new Date().getFullYear()

export default function Cuotas() {
  const [cuotas, setCuotas]       = useState([])
  const [afiliados, setAfiliados] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterEstado, setFilter] = useState('todos')
  const [filterAnio, setAnio]     = useState(ANIO_ACTUAL)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: '', referencia: '', estado: 'pagado' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('cuotas').select('*, afiliados(nombre, apellidos, num_inscripcion)').order('created_at', { ascending: false }),
      supabase.from('afiliados').select('id, nombre, apellidos, num_inscripcion, tipo_inscripcion, padres_convivientes').eq('estado', 'activo').order('num_inscripcion')
    ])
    setCuotas(c || [])
    setAfiliados(a || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    let r = cuotas.filter(c => c.anio === Number(filterAnio))
    if (filterEstado !== 'todos') r = r.filter(c => c.estado === filterEstado)
    setFiltered(r)
  }, [cuotas, filterEstado, filterAnio])

  function openModal() {
    setForm({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: new Date().toISOString().split('T')[0], referencia: '', estado: 'pagado' })
    setMsg(null)
    setModal(true)
  }

  function updateForm(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Autocompletar importe si seleccionamos afiliado
      if (k === 'afiliado_id') {
        const af = afiliados.find(a => a.id === v)
        if (af) {
          const base = af.tipo_inscripcion === 'individual' ? 25 : 50
          next.importe = base + (af.padres_convivientes || 0) * 25
        }
      }
      return next
    })
  }

  async function guardar() {
    if (!form.afiliado_id || !form.importe) {
      setMsg({ type: 'error', text: 'Selecciona un afiliado e indica el importe.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('cuotas').insert({
      afiliado_id: form.afiliado_id,
      anio: Number(form.anio),
      importe: Number(form.importe),
      fecha_pago: form.estado === 'pagado' ? form.fecha_pago : null,
      referencia: form.referencia,
      estado: form.estado
    })
    if (error) {
      setMsg({ type: 'error', text: 'Error: ' + error.message })
    } else {
      await fetch()
      setModal(false)
    }
    setSaving(false)
  }

  const totalCobrado = filtered.filter(c => c.estado === 'pagado').reduce((s, c) => s + Number(c.importe), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Cuotas y pagos</div>
        <div className="page-subtitle">Seguimiento de cotizaciones anuales</div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card">
          <div className="stat-label">Cobrado ({filterAnio})</div>
          <div className="stat-value">{totalCobrado.toLocaleString('es-ES')}€</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Registros mostrados</div>
          <div className="stat-value">{filtered.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value">{filtered.filter(c => c.estado === 'pendiente').length}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" style={{width:'auto'}} value={filterAnio} onChange={e => setAnio(e.target.value)}>
            {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select" style={{width:'auto'}} value={filterEstado} onChange={e => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="impagado">Impagado</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Registrar pago</button>
      </div>

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando cuotas...</span></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Nº</th><th>Afiliado</th><th>Año</th><th>Importe</th><th>Fecha pago</th><th>Referencia</th><th>Estado</th></tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>No hay registros para los filtros seleccionados.</td></tr>
                    : filtered.map(c => (
                      <tr key={c.id}>
                        <td className="mono">{c.afiliados?.num_inscripcion || '—'}</td>
                        <td>{c.afiliados?.nombre} {c.afiliados?.apellidos}</td>
                        <td>{c.anio}</td>
                        <td style={{fontWeight:500}}>{Number(c.importe).toLocaleString('es-ES')}€</td>
                        <td style={{color:'var(--muted)'}}>{c.fecha_pago || '—'}</td>
                        <td className="mono">{c.referencia || '—'}</td>
                        <td><span className={`badge badge-${c.estado}`}>{c.estado}</span></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Registrar pago de cuota</div>
              <button className="close-btn" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group full">
                  <label className="form-label">Afiliado</label>
                  <select className="form-select" value={form.afiliado_id} onChange={e => updateForm('afiliado_id', e.target.value)}>
                    <option value="">— Selecciona afiliado —</option>
                    {afiliados.map(a => (
                      <option key={a.id} value={a.id}>{a.num_inscripcion} · {a.nombre} {a.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Año</label>
                  <select className="form-select" value={form.anio} onChange={e => updateForm('anio', e.target.value)}>
                    {[ANIO_ACTUAL, ANIO_ACTUAL - 1].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  <input className="form-input" type="number" value={form.importe} onChange={e => updateForm('importe', e.target.value)} placeholder="50" />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado del pago</label>
                  <select className="form-select" value={form.estado} onChange={e => updateForm('estado', e.target.value)}>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="impagado">Impagado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de pago</label>
                  <input className="form-input" type="date" value={form.fecha_pago} onChange={e => updateForm('fecha_pago', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Justificante / Referencia</label>
                  <input className="form-input" value={form.referencia} onChange={e => updateForm('referencia', e.target.value)} placeholder="Nº transferencia o recibo" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
