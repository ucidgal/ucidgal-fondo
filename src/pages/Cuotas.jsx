import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ModalEliminar from '../components/ModalEliminar'

const ANIO_ACTUAL = new Date().getFullYear()

export default function Cuotas() {
  const [cuotas, setCuotas]       = useState([])
  const [afiliados, setAfiliados] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterEstado, setFilter] = useState('todos')
  const [filterAnio, setAnio]     = useState(ANIO_ACTUAL)
  const [modal, setModal]         = useState(null)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]           = useState({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: '', referencia: '', estado: 'pagado' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const [eliminar, setEliminar]   = useState(null)
  const [cuotaSelec, setCuotaSelec] = useState(null)

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

  function openNuevo() {
    setForm({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: new Date().toISOString().split('T')[0], referencia: '', estado: 'pagado' })
    setEditando(null)
    setMsg(null)
    setModal('nuevo')
  }

  function openEditar(c) {
    setForm({
      afiliado_id: c.afiliado_id,
      anio: c.anio,
      importe: Number(c.importe),
      fecha_pago: c.fecha_pago || '',
      referencia: c.referencia || '',
      estado: c.estado
    })
    setEditando(c)
    setMsg(null)
    setModal('editar')
  }

  function closeModal() { setModal(null); setEditando(null); setMsg(null) }

  function exportarExcel() {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => {
      const XLSX = window.XLSX
      const datos = filtered.map(c => ({
        'Nº Inscripción': c.afiliados?.num_inscripcion || '—',
        'Nombre':         `${c.afiliados?.nombre || ''} ${c.afiliados?.apellidos || ''}`.trim(),
        'Año':            c.anio,
        'Tipo':           c.tipo || '',
        'Importe (€)':    Number(c.importe),
        'Fecha Pago':     c.fecha_pago || '—',
        'Referencia':     c.referencia || '—',
        'Estado':         c.estado,
      }))
      const ws = XLSX.utils.json_to_sheet(datos)
      ws['!cols'] = [{wch:14},{wch:24},{wch:6},{wch:12},{wch:12},{wch:14},{wch:20},{wch:12}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cuotas')
      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `UCIDGAL_Cuotas_${filterAnio}_${fecha}.xlsx`)
    }
    document.head.appendChild(script)
  }

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-ES')
    const total = filtered.filter(c => c.estado === 'pagado').reduce((s,c) => s + Number(c.importe), 0)
    const filas = filtered.map(c => `
      <tr>
        <td>${c.afiliados?.num_inscripcion || '—'}</td>
        <td>${c.afiliados?.nombre || ''} ${c.afiliados?.apellidos || ''}</td>
        <td>${c.anio}</td>
        <td>${Number(c.importe).toLocaleString('es-ES')}€</td>
        <td>${c.fecha_pago || '—'}</td>
        <td>${c.referencia || '—'}</td>
        <td><span class="${c.estado}">${c.estado}</span></td>
      </tr>`).join('')
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Cuotas UCIDGAL ${filterAnio}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a18; margin: 2cm; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .header img { width: 40px; height: 40px; object-fit: contain; }
        .org { font-size: 15px; font-weight: 600; }
        .sub { font-size: 11px; color: #6b6b68; }
        .meta { font-size: 11px; color: #6b6b68; margin-bottom: 16px; }
        .total-box { background: #E8F8FC; border-radius: 6px; padding: 10px 16px; margin-bottom: 16px; font-size: 13px; }
        .total-box strong { font-size: 18px; color: #1A8FA6; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #29BAD4; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px 8px; border-bottom: 0.5px solid #e0e0e0; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .pagado { color: #1A8FA6; font-weight:500; }
        .pendiente { color: #633806; }
        .impagado { color: #A32D2D; font-weight:500; }
        .footer { margin-top: 16px; font-size: 10px; color: #6b6b68; text-align: center; }
        @media print { body { margin: 1cm; } }
      </style></head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.png" alt="UCIDGAL" />
          <div><div class="org">Fondo de Decesos y Repatriación – UCIDGAL</div><div class="sub">Galicia, España</div></div>
        </div>
        <div class="meta">Cuotas ${filterAnio} · ${filtered.length} registros · Generado el ${fecha}</div>
        <div class="total-box">Total cobrado ${filterAnio}: <strong>${total.toLocaleString('es-ES')}€</strong> · ${filtered.filter(c=>c.estado==='pagado').length} pagadas · ${filtered.filter(c=>c.estado==='pendiente').length} pendientes</div>
        <table>
          <thead><tr><th>Nº</th><th>Afiliado</th><th>Año</th><th>Importe</th><th>Fecha pago</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="footer">UCIDGAL · contacto@ucidgal.org · Documento generado automáticamente</div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 400)
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

  async function eliminarCuota(motivo) {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'admin'
    await supabase.from('auditoria_eliminaciones').insert({
      tabla: 'cuotas',
      registro_id: cuotaSelec.id,
      datos_previos: cuotaSelec,
      motivo,
      usuario_email: email
    })
    await supabase.from('cuotas').delete().eq('id', cuotaSelec.id)
    setCuotaSelec(null)
    await fetch()
  }

  async function guardar() {
    if (!form.afiliado_id || !form.importe) {
      setMsg({ type: 'error', text: 'Selecciona un afiliado e indica el importe.' })
      return
    }
    setSaving(true)
    const payload = {
      afiliado_id: form.afiliado_id,
      anio: Number(form.anio),
      importe: Number(form.importe),
      fecha_pago: form.estado === 'pagado' ? (form.fecha_pago || null) : null,
      referencia: form.referencia || null,
      estado: form.estado
    }
    const { error } = modal === 'editar'
      ? await supabase.from('cuotas').update(payload).eq('id', editando.id)
      : await supabase.from('cuotas').insert(payload)
    if (error) {
      setMsg({ type: 'error', text: 'Error: ' + error.message })
    } else {
      await fetch()
      closeModal()
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
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn" onClick={exportarExcel}>
            <svg style={{width:'14px',height:'14px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm2 0v12h10V4H5zm2 2h6v2H7V6zm0 4h6v2H7v-2zm0 4h4v2H7v-2z" clipRule="evenodd"/></svg>
            Excel
          </button>
          <button className="btn" onClick={exportarPDF}>
            <svg style={{width:'14px',height:'14px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
            PDF
          </button>
          <button className="btn btn-primary" onClick={openNuevo}>+ Registrar pago</button>
        </div>
      </div>

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando cuotas...</span></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Nº</th><th>Afiliado</th><th>Año</th><th>Importe</th><th>Fecha pago</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
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
                        <td style={{display:'flex',gap:'6px'}}>
                          <button className="btn btn-sm" onClick={() => openEditar(c)}>Editar</button>
                          <button className="btn btn-sm" style={{color:'var(--danger-tx)',borderColor:'rgba(163,45,45,0.25)'}}
                            onClick={() => { setCuotaSelec(c); setEliminar({ tipo:'Cuota', nombre:`${c.afiliados?.nombre} ${c.afiliados?.apellidos}`, detalle:`Cuota ${c.anio} · ${Number(c.importe)}€ · ${c.estado}` }) }}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Registrar pago de cuota</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group full">
                  <label className="form-label">Afiliado</label>
                  <select className="form-select" value={form.afiliado_id} onChange={e => updateForm('afiliado_id', e.target.value)} disabled={modal === 'editar'}>
                    <option value="">— Selecciona afiliado —</option>
                    {afiliados.map(a => (
                      <option key={a.id} value={a.id}>{a.num_inscripcion} · {a.nombre} {a.apellidos}</option>
                    ))}
                  </select>
                  {modal === 'editar' && <span className="form-hint">El afiliado no se puede cambiar en una edición.</span>}
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
              <button className="btn" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : modal === 'editar' ? 'Guardar cambios' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
      <ModalEliminar
        config={eliminar}
        onConfirmar={(motivo) => { eliminarCuota(motivo); setEliminar(null) }}
        onCancelar={() => { setEliminar(null); setCuotaSelec(null) }}
      />
    </div>
  )
}
