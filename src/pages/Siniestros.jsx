import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ModalConfirmar from '../components/ModalConfirmar'
import ModalEliminar  from '../components/ModalEliminar'

function genExpediente(total) {
  return `SIN-${new Date().getFullYear()}-${String(total + 1).padStart(3, '0')}`
}

const EMPTY_FORM = {
  nombre_fallecido: '', afiliado_id: '', fecha_fallecimiento: '',
  lugar_fallecimiento: '', tipo_fallecido: 'adulto',
  tipo_servicio: 'repatriacion', pais_destino: '',
  cert_defuncion: 'pendiente', permiso_traslado: 'pendiente',
  observaciones: '', estado: 'abierto',
  gasto_total: '', gasto_descripcion: ''
}

const labels = {
  repatriacion: 'Repatriación', entierro_local: 'Entierro local',
  abierto: 'Abierto', procesando: 'Procesando', cerrado: 'Cerrado',
  pendiente: 'Pendiente', recibido: 'Recibido', obtenido: 'Obtenido',
  adulto: 'Adulto', menor_un_anio: 'Menor de 1 año', aborto: 'Aborto (excluido)'
}

export default function Siniestros() {
  const [siniestros, setSiniestros] = useState([])
  const [afiliados, setAfiliados]   = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterEstado, setFilter]   = useState('todos')
  const [modal, setModal]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState(null)
  const [confirmar, setConfirmar]   = useState(null)
  const [eliminar, setEliminar]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from('siniestros').select('*, afiliados(nombre, apellidos, num_inscripcion)').order('created_at', { ascending: false }),
      supabase.from('afiliados_estado_real').select('id, nombre, apellidos, num_inscripcion, estado, estado_calculado, matrimonio_mixto, created_at').order('num_inscripcion')
    ])
    setSiniestros(s || [])
    setAfiliados(a || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    let r = siniestros
    if (filterEstado !== 'todos') r = r.filter(s => s.estado === filterEstado)
    setFiltered(r)
  }, [siniestros, filterEstado])

  function exportarExcel() {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => {
      const XLSX = window.XLSX
      const datos = filtered.map(s => ({
        'Expediente':         s.num_expediente,
        'Fallecido':          s.nombre_fallecido,
        'Tipo fallecido':     labels[s.tipo_fallecido] || '—',
        'Afiliado titular':   `${s.afiliados?.num_inscripcion || ''} · ${s.afiliados?.nombre || ''} ${s.afiliados?.apellidos || ''}`.trim(),
        'Tipo servicio':      labels[s.tipo_servicio],
        'Fecha fallecimiento':s.fecha_fallecimiento || '—',
        'Lugar':              s.lugar_fallecimiento || '—',
        'Destino':            s.pais_destino || '—',
        'Cert. defunción':    labels[s.cert_defuncion],
        'Permiso traslado':   labels[s.permiso_traslado],
        'Estado':             labels[s.estado],
        'Observaciones':      s.observaciones || '',
        'Gasto total (€)':    s.gasto_total ? Number(s.gasto_total).toLocaleString('es-ES') : '—',
        'Descripción gasto':  s.gasto_descripcion || '',
        'Fecha apertura':     s.created_at ? new Date(s.created_at).toLocaleDateString('es-ES') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(datos)
      ws['!cols'] = [{wch:16},{wch:22},{wch:14},{wch:28},{wch:16},{wch:18},{wch:18},{wch:14},{wch:16},{wch:16},{wch:12},{wch:30},{wch:14}]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Siniestros')
      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `UCIDGAL_Siniestros_${fecha}.xlsx`)
    }
    document.head.appendChild(script)
  }

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-ES')
    const filas = filtered.map(s => `
      <tr>
        <td>${s.num_expediente}</td>
        <td>${s.nombre_fallecido}</td>
        <td>${labels[s.tipo_servicio]}</td>
        <td>${s.afiliados?.nombre || ''} ${s.afiliados?.apellidos || ''}</td>
        <td>${s.fecha_fallecimiento || '—'}</td>
        <td>${s.pais_destino || s.lugar_fallecimiento || '—'}</td>
        <td><span class="estado-${s.estado}">${labels[s.estado]}</span></td>
      </tr>`).join('')
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Expedientes UCIDGAL</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a18; margin: 2cm; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .header img { width: 40px; height: 40px; object-fit: contain; }
        .org { font-size: 15px; font-weight: 600; }
        .sub { font-size: 11px; color: #6b6b68; }
        .meta { font-size: 11px; color: #6b6b68; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #29BAD4; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px 8px; border-bottom: 0.5px solid #e0e0e0; vertical-align:top; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .estado-abierto { color: #633806; }
        .estado-procesando { color: #185FA5; }
        .estado-cerrado { color: #1A8FA6; }
        .footer { margin-top: 16px; font-size: 10px; color: #6b6b68; text-align: center; }
        @media print { body { margin: 1cm; } }
      </style></head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.png" alt="UCIDGAL" />
          <div><div class="org">Fondo de Decesos y Repatriación – UCIDGAL</div><div class="sub">Galicia, España</div></div>
        </div>
        <div class="meta">Expedientes de fallecidos · ${filtered.length} registros · Generado el ${fecha}</div>
        <table>
          <thead><tr><th>Expediente</th><th>Fallecido</th><th>Servicio</th><th>Titular</th><th>Fecha</th><th>Destino</th><th>Estado</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="footer">UCIDGAL · contacto@ucidgal.org · Documento generado automáticamente</div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  async function eliminarSiniestro(motivo) {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'admin'
    await supabase.from('auditoria_eliminaciones').insert({
      tabla: 'siniestros',
      registro_id: selected.id,
      datos_previos: selected,
      motivo,
      usuario_email: email
    })
    await supabase.from('siniestros').delete().eq('id', selected.id)
    closeModal()
    await fetch()
  }

  function openNuevo()   { setForm(EMPTY_FORM); setMsg(null); setModal('nuevo') }
  function openDetalle(s){ setSelected(s); setModal('detalle') }
  function closeModal()  { setModal(null); setSelected(null) }
  function updateForm(k,v){ setForm(f => ({ ...f, [k]: v })) }

  const esAborto = form.tipo_fallecido === 'aborto'
  const esMenor  = form.tipo_fallecido === 'menor_un_anio'

  // Find selected afiliado to validate rules
  const afiliadoSelec = afiliados.find(a => a.id === form.afiliado_id)

  // Art. 11 — check afiliado is active (carencia check done via cuota fetch)
  const afiliadoInactivo = afiliadoSelec && !['activo'].includes(afiliadoSelec.estado_calculado || afiliadoSelec.estado)
  const tieneMatrimonioMixto = afiliadoSelec?.matrimonio_mixto === true

  async function guardar() {
    // Art. 14 — aborto excluido
    if (esAborto) {
      setMsg({ type: 'error', text: 'Art. 14: los casos de aborto están excluidos del servicio del fondo.' })
      return
    }
    if (!form.nombre_fallecido || !form.afiliado_id) {
      setMsg({ type: 'error', text: 'Indica el nombre del fallecido y el afiliado titular.' })
      return
    }
    // Art. 11 — afiliado debe estar activo
    if (afiliadoInactivo) {
      setMsg({ type: 'error', text: `Art. 11: el afiliado ${afiliadoSelec.nombre} ${afiliadoSelec.apellidos} no está activo (estado: ${afiliadoSelec.estado}). Solo los afiliados activos tienen derecho al servicio.` })
      return
    }
    // Art. 11 — verificar que ha pasado el periodo de carencia (90 días desde el pago)
    const { data: cuotaPagada } = await supabase
      .from('cuotas').select('fecha_pago').eq('afiliado_id', form.afiliado_id)
      .eq('estado', 'pagado').order('fecha_pago', { ascending: false }).limit(1).maybeSingle()
    if (!cuotaPagada?.fecha_pago) {
      setMsg({ type: 'error', text: 'Art. 11: el afiliado no tiene ninguna cuota pagada registrada. No tiene cobertura activa.' })
      return
    }
    const finCarencia = new Date(cuotaPagada.fecha_pago)
    finCarencia.setDate(finCarencia.getDate() + 90)
    const fechaFallec = form.fecha_fallecimiento ? new Date(form.fecha_fallecimiento) : new Date()
    if (fechaFallec < finCarencia) {
      setMsg({ type: 'error', text: `Art. 11: el afiliado está en periodo de carencia hasta el ${finCarencia.toLocaleDateString('es-ES')}. El fallecimiento ocurrió antes de que terminara la carencia.` })
      return
    }
    setSaving(true)
    // Art. 14 — menor de 1 año siempre entierro local
    const tipoServicioFinal = esMenor ? 'entierro_local' : form.tipo_servicio
    const { error } = await supabase.from('siniestros').insert({
      ...form,
      tipo_servicio: tipoServicioFinal,
      num_expediente: genExpediente(siniestros.length),
      updated_at: new Date().toISOString()
    })
    if (error) { setMsg({ type: 'error', text: 'Error: ' + error.message }) }
    else { await fetch(); closeModal() }
    setSaving(false)
  }

  async function actualizarGasto(id, total, desc) {
    await supabase.from('siniestros').update({
      gasto_total: total ? Number(total) : null,
      gasto_descripcion: desc || null,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    fetch()
  }

  async function actualizarCampo(id, campo, valor) {
    await supabase.from('siniestros').update({ [campo]: valor, updated_at: new Date().toISOString() }).eq('id', id)
    fetch()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Fallecidos y siniestros</div>
        <div className="page-subtitle">Tramitación de entierros y repatriaciones</div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" style={{width:'auto'}} value={filterEstado} onChange={e => setFilter(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="procesando">Procesando</option>
            <option value="cerrado">Cerrado</option>
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
          <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo expediente</button>
        </div>
      </div>

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando expedientes...</span></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Expediente</th><th>Fallecido</th><th>Tipo</th><th>Titular</th><th>Fecha</th><th>Destino</th><th>Gasto</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={8} style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>No hay expedientes.</td></tr>
                    : filtered.map(s => (
                      <tr key={s.id}>
                        <td className="mono">{s.num_expediente}</td>
                        <td style={{fontWeight:500}}>{s.nombre_fallecido}</td>
                        <td style={{color:'var(--muted)',fontSize:'12px'}}>{labels[s.tipo_fallecido] || '—'}</td>
                        <td style={{color:'var(--muted)'}}>{s.afiliados?.nombre} {s.afiliados?.apellidos}</td>
                        <td style={{color:'var(--muted)'}}>{s.fecha_fallecimiento || '—'}</td>
                        <td>{s.pais_destino || s.lugar_fallecimiento || '—'}</td>
                        <td>{s.gasto_total
                          ? <span style={{fontWeight:500,color:'var(--text)'}}>{Number(s.gasto_total).toLocaleString('es-ES')}€</span>
                          : <span style={{color:'var(--muted)'}}>—</span>}
                        </td>
                        <td><span className={`badge badge-${s.estado}`}>{labels[s.estado]}</span></td>
                        <td><button className="btn btn-sm" onClick={() => openDetalle(s)}>Ver</button></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>

      {modal === 'nuevo' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Apertura de expediente</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}

              <div className="form-section" style={{marginBottom:'1rem'}}>Datos del fallecido</div>
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group full">
                  <label className="form-label">Nombre completo del fallecido</label>
                  <input className="form-input" value={form.nombre_fallecido} onChange={e => updateForm('nombre_fallecido', e.target.value)} placeholder="Nombre y apellidos" />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de fallecido (Art. 14)</label>
                  <select className="form-select" value={form.tipo_fallecido} onChange={e => updateForm('tipo_fallecido', e.target.value)}>
                    <option value="adulto">Adulto</option>
                    <option value="menor_un_anio">Recién nacido / menor de 1 año</option>
                    <option value="aborto">Aborto</option>
                  </select>
                </div>

                {form.tipo_fallecido === 'menor_un_anio' && (
                  <div className="form-group" style={{alignSelf:'center'}}>
                    <div className="alert alert-warn" style={{marginBottom:0}}>
                      Art. 14 · Los recién nacidos serán enterrados en cementerio islámico en España.
                    </div>
                  </div>
                )}

                {esAborto && (
                  <div className="form-group full">
                    <div className="alert alert-error">
                      Art. 14 · Los casos de aborto están <strong>excluidos</strong> del servicio del fondo. No se puede abrir expediente.
                    </div>
                  </div>
                )}

                {!esAborto && (<>
                  <div className="form-group full">
                    <label className="form-label">Afiliado titular</label>
                    <select className="form-select" value={form.afiliado_id} onChange={e => updateForm('afiliado_id', e.target.value)}
                      style={afiliadoInactivo ? {borderColor:'var(--danger-tx)'} : {}}>
                      <option value="">— Selecciona titular —</option>
                      {afiliados.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.num_inscripcion} · {a.nombre} {a.apellidos}{(a.estado_calculado || a.estado) !== 'activo' ? ` (${a.estado_calculado || a.estado})` : ''}
                        </option>
                      ))}
                    </select>
                    {afiliadoInactivo && (
                      <div className="alert alert-error" style={{marginTop:'6px',marginBottom:0}}>
                        Art. 11 · Este afiliado está en estado "{afiliadoSelec.estado}" y no tiene derecho al servicio.
                      </div>
                    )}
                    {tieneMatrimonioMixto && !afiliadoInactivo && (
                      <div className="alert alert-warn" style={{marginTop:'6px',marginBottom:0}}>
                        Art. 15 · Este afiliado tiene matrimonio mixto. Verifica que aportó acta notarial al inscribirse.
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de fallecimiento</label>
                    <input className="form-input" type="date" value={form.fecha_fallecimiento} onChange={e => updateForm('fecha_fallecimiento', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lugar de fallecimiento</label>
                    <input className="form-input" value={form.lugar_fallecimiento} onChange={e => updateForm('lugar_fallecimiento', e.target.value)} placeholder="Hospital, ciudad..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de servicio</label>
                    {esMenor
                      ? <div style={{padding:'8px 10px',background:'var(--bg)',borderRadius:'var(--radius-sm)',fontSize:'13px',color:'var(--muted)',border:'1px solid var(--border)'}}>
                          Entierro en cementerio islámico (España) <span style={{fontSize:'11px',color:'var(--accent-dk)'}}>— Art. 14, obligatorio</span>
                        </div>
                      : <select className="form-select" value={form.tipo_servicio} onChange={e => updateForm('tipo_servicio', e.target.value)}>
                          <option value="repatriacion">Repatriación al país de origen</option>
                          <option value="entierro_local">Entierro en cementerio islámico (España)</option>
                        </select>
                    }
                  </div>
                  {form.tipo_servicio === 'repatriacion' && (
                    <div className="form-group">
                      <label className="form-label">País / Ciudad de destino</label>
                      <input className="form-input" value={form.pais_destino} onChange={e => updateForm('pais_destino', e.target.value)} placeholder="País de origen" />
                    </div>
                  )}
                </>)}
              </div>

              {!esAborto && (<>
                <div className="form-section" style={{marginBottom:'1rem'}}>Documentación</div>
                <div className="form-grid" style={{marginBottom:'1rem'}}>
                  <div className="form-group">
                    <label className="form-label">Certificado de defunción</label>
                    <select className="form-select" value={form.cert_defuncion} onChange={e => updateForm('cert_defuncion', e.target.value)}>
                      <option value="pendiente">Pendiente</option>
                      <option value="recibido">Recibido</option>
                    </select>
                  </div>
                  {(form.tipo_servicio === 'repatriacion' && !esMenor) && (
                    <div className="form-group">
                      <label className="form-label">Permiso de traslado</label>
                      <select className="form-select" value={form.permiso_traslado} onChange={e => updateForm('permiso_traslado', e.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="obtenido">Obtenido</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group full">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" value={form.observaciones} onChange={e => updateForm('observaciones', e.target.value)} placeholder="Notas relevantes..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gasto total (€)</label>
                    <input className="form-input" type="number" min="0" step="0.01" value={form.gasto_total}
                      onChange={e => updateForm('gasto_total', e.target.value)} placeholder="0.00" />
                    <span className="form-hint">Coste total del servicio cubierto por el fondo</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descripción del gasto</label>
                    <input className="form-input" value={form.gasto_descripcion}
                      onChange={e => updateForm('gasto_descripcion', e.target.value)}
                      placeholder="Ej: Traslado + ataúd + gestiones consulares..." />
                  </div>
                </div>
              </>)}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancelar</button>
              {!esAborto && (
                <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Abriendo...' : 'Abrir expediente'}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{selected.num_expediente}</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Fallecido', selected.nombre_fallecido],
                ['Tipo fallecido', labels[selected.tipo_fallecido] || '—'],
                ['Afiliado titular', `${selected.afiliados?.num_inscripcion} · ${selected.afiliados?.nombre} ${selected.afiliados?.apellidos}`],
                ['Tipo de servicio', labels[selected.tipo_servicio]],
                ['Fecha de fallecimiento', selected.fecha_fallecimiento || '—'],
                ['Lugar', selected.lugar_fallecimiento || '—'],
                ['Destino', selected.pais_destino || '—'],
                ['Cert. defunción', <span className={`badge badge-${selected.cert_defuncion === 'recibido' ? 'activo' : 'pendiente'}`}>{labels[selected.cert_defuncion]}</span>],
                ['Permiso traslado', <span className={`badge badge-${selected.permiso_traslado === 'obtenido' ? 'activo' : 'pendiente'}`}>{labels[selected.permiso_traslado]}</span>],
                ['Estado', <span className={`badge badge-${selected.estado}`}>{labels[selected.estado]}</span>],
                ['Observaciones', selected.observaciones || '—'],
                ['Gasto total', selected.gasto_total ? <span style={{fontWeight:500,fontSize:'15px',color:'var(--accent)'}}>{Number(selected.gasto_total).toLocaleString('es-ES')}€</span> : '—'],
                ['Descripción gasto', selected.gasto_descripcion || '—'],
              ].map(([l, v]) => (
                <div className="detail-row" key={l}><span className="detail-label">{l}</span><span>{v}</span></div>
              ))}

              <div style={{marginTop:'1.25rem'}}>
                <div className="form-section" style={{marginBottom:'0.75rem'}}>Actualizar estado expediente</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {['abierto','procesando'].map(e => (
                    <button key={e} className={`btn btn-sm ${selected.estado === e ? 'btn-primary' : ''}`}
                      onClick={() => { actualizarCampo(selected.id, 'estado', e); setSelected(s => ({...s, estado: e})) }}>
                      {labels[e]}
                    </button>
                  ))}
                  <button className={`btn btn-sm ${selected.estado === 'cerrado' ? 'btn-primary' : ''}`}
                    onClick={() => setConfirmar({
                      titulo: 'Cerrar expediente',
                      mensaje: `¿Confirmas que deseas cerrar el expediente ${selected.num_expediente}? Esta acción indica que el servicio ha sido completado.`,
                      labelConfirmar: 'Cerrar expediente',
                      tipo: 'warn',
                      accion: () => { actualizarCampo(selected.id, 'estado', 'cerrado'); setSelected(s => ({...s, estado:'cerrado'})) }
                    })}>
                    {labels['cerrado']}
                  </button>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}>
                  <button className={`btn btn-sm ${selected.cert_defuncion === 'recibido' ? 'btn-primary' : ''}`}
                    onClick={() => { actualizarCampo(selected.id, 'cert_defuncion', 'recibido'); setSelected(s => ({...s, cert_defuncion:'recibido'})) }}>
                    Cert. defunción recibido
                  </button>
                  <button className={`btn btn-sm ${selected.permiso_traslado === 'obtenido' ? 'btn-primary' : ''}`}
                    onClick={() => { actualizarCampo(selected.id, 'permiso_traslado', 'obtenido'); setSelected(s => ({...s, permiso_traslado:'obtenido'})) }}>
                    Permiso traslado obtenido
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" style={{color:'var(--danger-tx)',borderColor:'rgba(163,45,45,0.3)'}}
                onClick={() => setEliminar({
                  tipo: 'Expediente',
                  nombre: selected.nombre_fallecido,
                  detalle: `${selected.num_expediente} · ${labels[selected.tipo_servicio]}`
                })}>
                <svg style={{width:'13px',height:'13px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                Eliminar
              </button>
              <button className="btn" onClick={closeModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <ModalEliminar
        config={eliminar}
        onConfirmar={(motivo) => { eliminarSiniestro(motivo); setEliminar(null) }}
        onCancelar={() => setEliminar(null)}
      />

      <ModalConfirmar
        config={confirmar}
        onConfirmar={() => { confirmar?.accion(); setConfirmar(null) }}
        onCancelar={() => setConfirmar(null)}
      />
    </div>
  )
}
