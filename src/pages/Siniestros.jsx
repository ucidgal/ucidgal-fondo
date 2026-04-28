import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function genExpediente(total) {
  return `SIN-${new Date().getFullYear()}-${String(total + 1).padStart(3, '0')}`
}

const EMPTY_FORM = {
  nombre_fallecido: '', afiliado_id: '', fecha_fallecimiento: '',
  lugar_fallecimiento: '', tipo_fallecido: 'adulto',
  tipo_servicio: 'repatriacion', pais_destino: '',
  cert_defuncion: 'pendiente', permiso_traslado: 'pendiente',
  observaciones: '', estado: 'abierto'
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

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from('siniestros').select('*, afiliados(nombre, apellidos, num_inscripcion)').order('created_at', { ascending: false }),
      supabase.from('afiliados').select('id, nombre, apellidos, num_inscripcion').order('num_inscripcion')
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

  function openNuevo()   { setForm(EMPTY_FORM); setMsg(null); setModal('nuevo') }
  function openDetalle(s){ setSelected(s); setModal('detalle') }
  function closeModal()  { setModal(null); setSelected(null) }
  function updateForm(k,v){ setForm(f => ({ ...f, [k]: v })) }

  const esAborto = form.tipo_fallecido === 'aborto'

  async function guardar() {
    if (esAborto) {
      setMsg({ type: 'error', text: 'Art. 14 del Reglamento: los casos de aborto están excluidos del servicio del fondo.' })
      return
    }
    if (!form.nombre_fallecido || !form.afiliado_id) {
      setMsg({ type: 'error', text: 'Indica el nombre del fallecido y el afiliado titular.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('siniestros').insert({
      ...form,
      num_expediente: genExpediente(siniestros.length),
      updated_at: new Date().toISOString()
    })
    if (error) { setMsg({ type: 'error', text: 'Error: ' + error.message }) }
    else { await fetch(); closeModal() }
    setSaving(false)
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
        <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo expediente</button>
      </div>

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando expedientes...</span></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Expediente</th><th>Fallecido</th><th>Tipo</th><th>Titular</th><th>Fecha</th><th>Destino</th><th>Estado</th><th></th></tr></thead>
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
                    <select className="form-select" value={form.afiliado_id} onChange={e => updateForm('afiliado_id', e.target.value)}>
                      <option value="">— Selecciona titular —</option>
                      {afiliados.map(a => <option key={a.id} value={a.id}>{a.num_inscripcion} · {a.nombre} {a.apellidos}</option>)}
                    </select>
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
                    <select className="form-select" value={form.tipo_servicio} onChange={e => updateForm('tipo_servicio', e.target.value)}>
                      <option value="repatriacion">Repatriación al país de origen</option>
                      {form.tipo_fallecido === 'menor_un_anio'
                        ? <option value="entierro_local" selected>Entierro en cementerio islámico (España)</option>
                        : <option value="entierro_local">Entierro en cementerio islámico (España)</option>
                      }
                    </select>
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
                  <div className="form-group">
                    <label className="form-label">Permiso de traslado</label>
                    <select className="form-select" value={form.permiso_traslado} onChange={e => updateForm('permiso_traslado', e.target.value)}>
                      <option value="pendiente">Pendiente</option>
                      <option value="obtenido">Obtenido</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" value={form.observaciones} onChange={e => updateForm('observaciones', e.target.value)} placeholder="Notas relevantes..." />
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
              ].map(([l, v]) => (
                <div className="detail-row" key={l}><span className="detail-label">{l}</span><span>{v}</span></div>
              ))}

              <div style={{marginTop:'1.25rem'}}>
                <div className="form-section" style={{marginBottom:'0.75rem'}}>Actualizar estado expediente</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {['abierto','procesando','cerrado'].map(e => (
                    <button key={e} className={`btn btn-sm ${selected.estado === e ? 'btn-primary' : ''}`}
                      onClick={() => { actualizarCampo(selected.id, 'estado', e); setSelected(s => ({...s, estado: e})) }}>
                      {labels[e]}
                    </button>
                  ))}
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
              <button className="btn" onClick={closeModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
