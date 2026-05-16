import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ModalEliminar from '../components/ModalEliminar'

const ANIO_ACTUAL = new Date().getFullYear()

export default function Cuotas() {
  const [cuotas, setCuotas]       = useState([])
  const [afiliados, setAfiliados] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterAnio, setAnio]     = useState(ANIO_ACTUAL)
  const [modal, setModal]         = useState(null)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]           = useState({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: new Date().toISOString().split('T')[0], referencia: '', estado: 'pagado' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const [eliminar, setEliminar]   = useState(null)
  const [cuotaSelec, setCuotaSelec]   = useState(null)
  const [subiendoJust, setSubiendoJust]   = useState(false)
  const [justUrl, setJustUrl]             = useState(null)
  const [busqAfiliado, setBusqAfiliado]   = useState('')
  const location = useLocation()

  // Auto-open nuevo pago modal if navigated from afiliado
  useEffect(() => {
    if (location.state?.afiliado_id && afiliados.length > 0) {
      setForm(f => ({ ...f, afiliado_id: location.state.afiliado_id }))
      setModal('nuevo')
      // Clear state so it doesn't re-trigger
      window.history.replaceState({}, '')
    }
  }, [location.state, afiliados])

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('cuotas').select('*, afiliados(nombre, apellidos, num_inscripcion)').order('created_at', { ascending: false }),
      supabase.from('afiliados').select('id, nombre, apellidos, num_inscripcion, tipo_inscripcion, padres_convivientes, estado').not('estado', 'in', '("baja_voluntaria","baja_impago","baja")').order('num_inscripcion')
    ])
    setCuotas(c || [])
    setAfiliados(a || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    setFiltered(cuotas.filter(c => c.anio === Number(filterAnio)))
  }, [cuotas, filterAnio])

  function openNuevo() {
    setForm({ afiliado_id: '', anio: ANIO_ACTUAL, importe: '', fecha_pago: new Date().toISOString().split('T')[0], referencia: '', estado: 'pagado' })
    setEditando(null)
    setMsg(null)
    setBusqAfiliado('')
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

  function closeModal() { setModal(null); setEditando(null); setMsg(null); setBusqAfiliado('') }

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
        <div class="total-box">Total cobrado ${filterAnio}: <strong>${total.toLocaleString('es-ES')}€</strong> · ${filtered.filter(c=>c.estado!=='anulado').length} pagos registrados · ${filtered.filter(c=>c.estado==='anulado').length} anulados</div>
        <table>
          <thead><tr><th>Nº</th><th>Afiliado</th><th>Año</th><th>Importe</th><th>Fecha pago</th><th>Válido hasta</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
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

  async function comprimirImagen(file, maxKB = 400) {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        const MAX_PX = 1800
        if (w > MAX_PX || h > MAX_PX) {
          const ratio = Math.min(MAX_PX / w, MAX_PX / h)
          w = Math.round(w * ratio); h = Math.round(h * ratio)
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        let quality = 0.85
        const tryCompress = () => {
          canvas.toBlob(blob => {
            if (blob.size <= maxKB * 1024 || quality <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            } else { quality -= 0.1; tryCompress() }
          }, 'image/jpeg', quality)
        }
        tryCompress()
      }
      img.src = url
    })
  }

  async function subirJustificante(file, cuotaId) {
    if (!file) return null
    const ext = file.name.split('.').pop().toLowerCase()
    const allowed = ['pdf','jpg','jpeg','png','webp']
    if (!allowed.includes(allowed.find(e => e === ext) || '')) {
      alert('Solo se permiten PDF, JPG o PNG.'); return null
    }
    setSubiendoJust(true)
    let fileToUpload = file
    if (['jpg','jpeg','png','webp'].includes(ext)) fileToUpload = await comprimirImagen(file)
    const finalExt = ['jpg','jpeg','png','webp'].includes(ext) ? 'jpg' : ext
    const path = `justificantes/${cuotaId}_${Date.now()}.${finalExt}`
    const { error } = await supabase.storage.from('documentos-afiliados').upload(path, fileToUpload, { upsert: true })
    setSubiendoJust(false)
    if (error) { alert('Error al subir: ' + error.message); return null }
    return path
  }

  async function guardar() {
    if (!form.afiliado_id || !form.importe) {
      setMsg({ type: 'error', text: 'Selecciona un afiliado e indica el importe.' })
      return
    }
    if (!form.fecha_pago) {
      setMsg({ type: 'error', text: 'La fecha de pago es obligatoria.' })
      return
    }

    setSaving(true)
    const payload = {
      afiliado_id: form.afiliado_id,
      anio: Number(form.anio),
      importe: Number(form.importe),
      fecha_pago: form.fecha_pago || null,
      referencia: form.referencia || null,
      estado: modal === 'editar' ? form.estado : 'pagado'
    }
    const { data: cuotaGuardada, error } = modal === 'editar'
      ? await supabase.from('cuotas').update(payload).eq('id', editando.id).select().single()
      : await supabase.from('cuotas').insert(payload).select().single()
    if (error) {
      setMsg({ type: 'error', text: 'Error: ' + error.message })
    } else {
      // Upload justificante file if selected
      if (form._justFile && cuotaGuardada?.id) {
        const path = await subirJustificante(form._justFile, cuotaGuardada.id)
        if (path) await supabase.from('cuotas').update({ referencia: path }).eq('id', cuotaGuardada.id)
      }
      // Auto-update afiliado estado when pago is registered as 'pagado'
      if (payload.estado === 'pagado' && payload.fecha_pago) {
        const fechaPago = new Date(payload.fecha_pago)
        const hoy = new Date()
        const diasDesde = Math.floor((hoy - fechaPago) / 86400000)
        const nuevoEstado = diasDesde < 90 ? 'en_carencia' : 'activo'
        await supabase.from('afiliados')
          .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
          .eq('id', payload.afiliado_id)
          .not('estado', 'in', '(baja_voluntaria,baja_impago,baja)')
      }
      await fetch()
      closeModal()
    }
    setSaving(false)
  }

  const totalCobrado = filtered.filter(c => c.estado !== 'anulado').reduce((s, c) => s + Number(c.importe), 0)

  // IDs of afiliados that already have a valid payment this year — excluded from new payment selector
  const yaPageronEsteAnio = new Set(
    cuotas.filter(c => c.anio === Number(form.anio) && c.estado !== 'anulado').map(c => c.afiliado_id)
  )
  const afiliadosDisponibles = modal === 'editar'
    ? afiliados
    : afiliados.filter(a => !yaPageronEsteAnio.has(a.id))

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Cuotas y pagos</div>
        <div className="page-subtitle">Seguimiento de cotizaciones anuales</div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card">
          <div className="stat-label">Total cobrado {filterAnio}</div>
          <div className="stat-value">{totalCobrado.toLocaleString('es-ES')}€</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pagos registrados</div>
          <div className="stat-value">{filtered.filter(c => c.estado !== 'anulado').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Anulados</div>
          <div className="stat-value">{filtered.filter(c => c.estado === 'anulado').length}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <select className="form-select" style={{width:'auto'}} value={filterAnio} onChange={e => setAnio(e.target.value)}>
            {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3].map(y => <option key={y} value={y}>{y}</option>)}
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
                <thead><tr><th>Nº</th><th>Afiliado</th><th>Año</th><th>Importe</th><th>Fecha pago</th><th>Válido hasta</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
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
                        <td>{(() => {
                          if (!c.fecha_pago || c.estado === 'anulado') return <span style={{color:'var(--muted)'}}>—</span>
                          const fin = new Date(c.fecha_pago)
                          fin.setDate(fin.getDate() + 90)
                          fin.setFullYear(fin.getFullYear() + 1)
                          const diasRestantes = Math.ceil((fin - new Date()) / 86400000)
                          const color = diasRestantes < 0 ? 'var(--danger-tx)' : diasRestantes < 30 ? '#854F0B' : 'var(--muted)'
                          return <span style={{fontSize:'12px',color}}>{fin.toLocaleDateString('es-ES')}{diasRestantes < 30 && diasRestantes >= 0 ? ` · ${diasRestantes}d` : ''}</span>
                        })()}</td>
                        <td>{c.referencia
                          ? c.referencia.startsWith('justificantes/')
                            ? <button className="btn btn-sm" onClick={async () => {
                                const { data } = await supabase.storage.from('documentos-afiliados').createSignedUrl(c.referencia, 60)
                                if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                              }}>Ver justificante</button>
                            : <span className="mono" style={{fontSize:'12px'}}>{c.referencia}</span>
                          : <span style={{color:'var(--muted)'}}>—</span>
                        }</td>
                        <td><span className={`badge badge-${c.estado === 'anulado' ? 'baja' : 'activo'}`}>{c.estado === 'anulado' ? 'Anulado' : 'Pagado'}</span></td>
                        <td style={{display:'flex',gap:'6px'}}>
                          {c.estado !== 'anulado' && <button className="btn btn-sm" onClick={() => openEditar(c)}>Editar</button>}
                          {c.estado !== 'anulado'
                            ? <button className="btn btn-sm" style={{color:'#854F0B',borderColor:'rgba(133,79,11,0.25)'}}
                                onClick={async () => {
                                  if (window.confirm('¿Anular este pago? El registro se conserva pero no contará en los totales.')) {
                                    await supabase.from('cuotas').update({ estado: 'anulado' }).eq('id', c.id)
                                    fetch()
                                  }
                                }}>Anular</button>
                            : <button className="btn btn-sm" style={{color:'var(--danger-tx)',borderColor:'rgba(163,45,45,0.25)'}}
                                onClick={() => { setCuotaSelec(c); setEliminar({ tipo:'Cuota', nombre:`${c.afiliados?.nombre} ${c.afiliados?.apellidos}`, detalle:`Cuota ${c.anio} · ${Number(c.importe)}€ · Anulada` }) }}>
                                Eliminar
                              </button>
                          }
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
              {location.state?.afiliado_id && modal === 'nuevo' && (
                <div className="alert alert-success" style={{marginBottom:'1rem'}}>
                  <span>Registrando pago para: </span>
                  <strong>{location.state.num_inscripcion} · {location.state.nombre}</strong>
                </div>
              )}
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group full">
                  <label className="form-label">Afiliado</label>
                  {modal === 'editar'
                    ? <>
                        <select className="form-select" value={form.afiliado_id} disabled>
                          {afiliados.map(a => <option key={a.id} value={a.id}>{a.num_inscripcion} · {a.nombre} {a.apellidos}</option>)}
                        </select>
                        <span className="form-hint">El afiliado no se puede cambiar en una edición.</span>
                      </>
                    : <>
                        <input className="form-input" value={busqAfiliado}
                          onChange={e => { setBusqAfiliado(e.target.value); updateForm('afiliado_id', '') }}
                          placeholder="Buscar por nombre, apellidos o Nº inscripción..."
                          style={{marginBottom:'6px'}} />
                        {afiliadosDisponibles.length === 0
                          ? <div style={{padding:'8px 10px',background:'var(--bg)',borderRadius:'var(--radius-sm)',fontSize:'12px',color:'var(--muted)'}}>
                              Todos los afiliados ya tienen pago registrado para {form.anio}.
                            </div>
                          : (() => {
                              const filtrados = busqAfiliado.trim()
                                ? afiliadosDisponibles.filter(a =>
                                    `${a.nombre} ${a.apellidos} ${a.num_inscripcion}`.toLowerCase().includes(busqAfiliado.toLowerCase())
                                  )
                                : afiliadosDisponibles
                              return filtrados.length === 0
                                ? <div style={{padding:'8px 10px',background:'var(--bg)',borderRadius:'var(--radius-sm)',fontSize:'12px',color:'var(--muted)'}}>
                                    Sin resultados para "{busqAfiliado}"
                                  </div>
                                : <select className="form-select" value={form.afiliado_id} onChange={e => {
                                    updateForm('afiliado_id', e.target.value)
                                  }} size={Math.min(filtrados.length + 1, 6)}
                                  style={{height:'auto'}}>
                                    <option value="">— Selecciona —</option>
                                    {filtrados.map(a => (
                                      <option key={a.id} value={a.id}
                                        style={{fontWeight: form.afiliado_id === a.id ? 500 : 400}}>
                                        {a.num_inscripcion} · {a.nombre} {a.apellidos}
                                      </option>
                                    ))}
                                  </select>
                            })()
                        }
                        {form.afiliado_id && (
                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px',fontSize:'12px',color:'var(--accent-dk)',padding:'4px 8px',background:'var(--accent-bg)',borderRadius:'var(--radius-sm)'}}>
                            <svg style={{width:'12px',height:'12px',flexShrink:0}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                            Afiliado seleccionado
                          </div>
                        )}
                      </>
                  }
                </div>
                <div className="form-group">
                  <label className="form-label">Año</label>
                  <select className="form-select" value={form.anio} onChange={e => updateForm('anio', e.target.value)}>
                    {[ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  {modal === 'editar'
                    ? <input className="form-input" type="number" value={form.importe} onChange={e => updateForm('importe', e.target.value)} />
                    : <div style={{padding:'8px 10px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:'13px',fontWeight:500,color:'var(--text)'}}>
                        {form.importe ? `${form.importe}€` : <span style={{color:'var(--muted)'}}>Se calculará al seleccionar afiliado</span>}
                      </div>
                  }
                  {modal === 'nuevo' && <span className="form-hint">Calculado según el tipo de inscripción del afiliado</span>}
                </div>
                {modal === 'editar' && (
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={e => updateForm('estado', e.target.value)}>
                      <option value="pagado">Pagado</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Fecha de pago</label>
                  <input className="form-input" type="date" value={form.fecha_pago} onChange={e => updateForm('fecha_pago', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Justificante de pago</label>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <input className="form-input" value={form.referencia} onChange={e => updateForm('referencia', e.target.value)}
                      placeholder="Nº transferencia, recibo, referencia..." />
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <label style={{cursor:'pointer',flex:1}}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{display:'none'}}
                          onChange={e => {
                            const f = e.target.files[0]
                            if (f) updateForm('_justFile', f)
                          }} />
                        <div style={{
                          display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',
                          border:'1px dashed var(--border-md)',borderRadius:'var(--radius-sm)',
                          fontSize:'12px',color:'var(--muted)',cursor:'pointer',
                          background: form._justFile ? 'var(--accent-bg)' : 'transparent'
                        }}>
                          <svg style={{width:'14px',height:'14px',flexShrink:0}} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                          </svg>
                          {subiendoJust ? 'Subiendo...' : form._justFile ? form._justFile.name : 'Subir foto o PDF del justificante (opcional)'}
                        </div>
                      </label>
                      {form._justFile && (
                        <button type="button" onClick={() => updateForm('_justFile', null)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'16px',padding:'4px'}}>✕</button>
                      )}
                    </div>
                    <span className="form-hint">PDF, JPG o PNG · máx. 10MB · se comprime automáticamente</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : modal === 'editar' ? 'Guardar cambios' : 'Registrar pago'}</button>
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
