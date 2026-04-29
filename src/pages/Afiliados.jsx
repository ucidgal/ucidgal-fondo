import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ModalConfirmar from '../components/ModalConfirmar'
import ModalEliminar  from '../components/ModalEliminar'

const PROVINCIAS    = ['A Coruña', 'Pontevedra', 'Lugo', 'Ourense']
const ESTADOS_CIVILES = ['Casado/a', 'Soltero/a', 'Viudo/a', 'Divorciado/a']

function calcularCuota(tipo, padres) {
  return (tipo === 'individual' ? 25 : 50) + (Number(padres) || 0) * 25
}

function genNumInscripcion(total) {
  return String(total + 1).padStart(4, '0')
}

function calcCarencia(fechaPago) {
  if (!fechaPago) return null
  const d = new Date(fechaPago)
  d.setDate(d.getDate() + 90)
  return d
}

function calcCaducidad(fechaPago) {
  // Caducidad = fecha de pago + 90 días de carencia + 1 año de cobertura
  const finCarencia = calcCarencia(fechaPago)
  if (!finCarencia) return null
  const caducidad = new Date(finCarencia)
  caducidad.setFullYear(caducidad.getFullYear() + 1)
  return caducidad
}

function estadoCarencia(fechaPago) {
  const fin = calcCarencia(fechaPago)
  if (!fin) return null
  const hoy = new Date()
  if (hoy < fin) {
    const dias = Math.ceil((fin - hoy) / 86400000)
    return { activa: true, texto: `Carencia: ${dias} días restantes (hasta ${fin.toLocaleDateString('es-ES')})` }
  }
  return { activa: false, texto: `Cobertura activa desde ${fin.toLocaleDateString('es-ES')}` }
}

const EMPTY_FORM = {
  nombre: '', apellidos: '', dni_nie: '', fecha_nacimiento: '',
  pais_origen: '', estado_civil: 'Casado/a', direccion: '',
  provincia: 'A Coruña', telefono: '', email: '',
  tipo_inscripcion: 'familia', num_miembros: 1, padres_convivientes: 0,
  estado: 'pendiente', matrimonio_mixto: false, hijos: []
}

function TarjetaVirtual({ afiliado, fechaPago, onClose }) {
  const carencia = estadoCarencia(fechaPago)
  const anio = new Date().getFullYear()
  const logoUrl = window.location.origin + '/logo.png'

  function imprimir() {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Tarjeta UCIDGAL</title>
      <style>
        body { margin:0; font-family: Arial, sans-serif; background:#f4f9fb; display:flex; align-items:center; justify-content:center; min-height:100vh; }
        .card { width:340px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.12); }
        .header { background:#29BAD4; padding:20px 24px 16px; color:#fff; }
        .header-top { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .logo-wrap { width:44px; height:44px; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .logo-wrap img { width:36px; height:36px; object-fit:contain; }
        .org { font-size:13px; font-weight:600; line-height:1.3; }
        .name { font-size:20px; font-weight:600; margin-bottom:4px; }
        .num { font-size:12px; opacity:0.85; letter-spacing:0.05em; }
        .body { padding:20px 24px; }
        .row { display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid #f0f0f0; }
        .row:last-child { border:none; }
        .lbl { color:#6b6b68; }
        .val { font-weight:500; color:#1a1a18; }
        .footer { background:#f4f9fb; padding:12px 24px; text-align:center; font-size:11px; color:#6b6b68; }
      </style></head>
      <body><div class="card">
        <div class="header">
          <div class="header-top">
            <div class="logo-wrap"><img src="${logoUrl}" alt="UCIDGAL" /></div>
            <div class="org">Fondo de Decesos y Repatriación – UCIDGAL</div>
          </div>
          <div class="name">${afiliado.nombre} ${afiliado.apellidos}</div>
          <div class="num">Nº ${afiliado.num_inscripcion} · ${anio}</div>
        </div>
        <div class="body">
          <div class="row"><span class="lbl">DNI/NIE</span><span class="val">${afiliado.dni_nie}</span></div>
          <div class="row"><span class="lbl">Tipo</span><span class="val">${afiliado.tipo_inscripcion === 'familia' ? 'Familiar' : 'Individual'}</span></div>
          <div class="row"><span class="lbl">Provincia</span><span class="val">${afiliado.provincia}</span></div>
          <div class="row"><span class="lbl">Cuota ${anio}</span><span class="val">${calcularCuota(afiliado.tipo_inscripcion, afiliado.padres_convivientes)}€ ${fechaPago ? '✓ Pagada' : '— Pendiente'}</span></div>
          ${fechaPago ? `<div class="row"><span class="lbl">Cobertura desde</span><span class="val">${calcCarencia(fechaPago)?.toLocaleDateString('es-ES') || '—'}</span></div>` : ''}
          <div class="row"><span class="lbl">Fecha de caducidad</span><span class="val" style="font-weight:600;color:#1A8FA6">${calcCaducidad(fechaPago)?.toLocaleDateString('es-ES') || '—'}</span></div>
        </div>
        <div class="footer">contacto@ucidgal.org · Galicia, España</div>
      </div></body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:'400px'}}>
        <div className="modal-header">
          <div className="modal-title">Tarjeta virtual de afiliado</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{background:'var(--accent)',borderRadius:'var(--radius-lg)',padding:'20px',color:'#fff',marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
              <div style={{width:'44px',height:'44px',background:'#fff',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <img src="/logo.png" alt="UCIDGAL" style={{width:'34px',height:'34px',objectFit:'contain'}} />
              </div>
              <div style={{fontSize:'13px',fontWeight:500,lineHeight:1.4}}>
                Fondo de Decesos y Repatriación – UCIDGAL
              </div>
            </div>
            <div style={{fontSize:'18px',fontWeight:500,marginBottom:'4px'}}>{afiliado.nombre} {afiliado.apellidos}</div>
            <div style={{fontSize:'12px',opacity:0.85}}>Nº {afiliado.num_inscripcion} · {anio}</div>
          </div>

          {[
            ['DNI / NIE', afiliado.dni_nie],
            ['Tipo', afiliado.tipo_inscripcion === 'familia' ? 'Familiar' : 'Individual'],
            ['Provincia', afiliado.provincia],
            ['Cuota anual', calcularCuota(afiliado.tipo_inscripcion, afiliado.padres_convivientes) + '€'],
            carencia ? ['Cobertura desde', <span style={{fontSize:'12px',color:'var(--muted)'}}>{carencia.texto}</span>] : null,
            ['Fecha de caducidad', <span style={{fontWeight:500,color:'var(--accent)'}}>{calcCaducidad(fechaPago)?.toLocaleDateString('es-ES') || '—'}</span>],
          ].filter(Boolean).map(([l, v]) => (
            <div className="detail-row" key={l}>
              <span className="detail-label">{l}</span>
              <span>{v || '—'}</span>
            </div>
          ))}

          <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'1rem',padding:'8px',background:'var(--bg)',borderRadius:'var(--radius-sm)'}}>
            Tarjeta gratuita · Art. 9 y 10 del Reglamento UCIDGAL. Válida hasta {calcCaducidad(fechaPago)?.toLocaleDateString('es-ES') || 'pendiente de pago'}.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={imprimir}>Imprimir / Guardar PDF</button>
        </div>
      </div>
    </div>
  )
}

export default function Afiliados() {
  const [afiliados, setAfiliados] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterEstado, setFilter] = useState('todos')
  const [filterPais, setFilterPais]   = useState('todos')
  const [filterTipo, setFilterTipo]   = useState('todos')
  const [filterAnio, setFilterAnio]   = useState('todos')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [paso, setPaso]             = useState(1)
  const [errores, setErrores]       = useState({})
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const [tarjeta, setTarjeta]         = useState(null)
  const [ultimoPago, setUltimoPago]   = useState(null)
  const [tabDetalle, setTabDetalle]   = useState('datos')
  const [historial, setHistorial]     = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [confirmar, setConfirmar]       = useState(null)
  const [eliminar, setEliminar]         = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('afiliados').select('*').order('num_inscripcion')
    setAfiliados(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Derived lists for filter dropdowns
  const paisesDisponibles = [...new Set(afiliados.map(a => a.pais_origen).filter(Boolean))].sort()
  const aniosDisponibles  = [...new Set(afiliados.map(a => a.created_at ? new Date(a.created_at).getFullYear() : null).filter(Boolean))].sort((a,b) => b - a)

  const filtrosActivos = [filterEstado, filterPais, filterTipo, filterAnio].filter(f => f !== 'todos').length

  useEffect(() => {
    let r = afiliados
    if (search)               r = r.filter(a => `${a.nombre} ${a.apellidos} ${a.dni_nie}`.toLowerCase().includes(search.toLowerCase()))
    if (filterEstado !== 'todos') r = r.filter(a => a.estado === filterEstado)
    if (filterPais   !== 'todos') r = r.filter(a => a.pais_origen === filterPais)
    if (filterTipo   !== 'todos') r = r.filter(a => a.tipo_inscripcion === filterTipo)
    if (filterAnio   !== 'todos') r = r.filter(a => a.created_at && new Date(a.created_at).getFullYear() === Number(filterAnio))
    setFiltered(r)
  }, [afiliados, search, filterEstado, filterPais, filterTipo, filterAnio])

  function limpiarFiltros() {
    setFilter('todos'); setFilterPais('todos'); setFilterTipo('todos'); setFilterAnio('todos'); setSearch('')
  }

  function openNuevo()   { setForm(EMPTY_FORM); setModal('nuevo'); setMsg(null); setPaso(1); setErrores({}) }
  function openEditar(a) { setSelected(a); setForm({ ...a }); setModal('editar'); setMsg(null); setPaso(1); setErrores({}) }
  function openDetalle(a){ setSelected(a); setModal('detalle'); setTabDetalle('datos'); setHistorial([]) }
  function closeModal()  { setModal(null); setSelected(null); setTabDetalle('datos') }

  async function registrarHistorial(afiliado_id, accion, cambios, email) {
    if (!cambios || cambios.length === 0) return
    const rows = cambios.map(c => ({
      afiliado_id,
      usuario_email: email || 'admin',
      accion,
      campo: c.campo,
      valor_anterior: c.anterior != null ? String(c.anterior) : null,
      valor_nuevo:    c.nuevo    != null ? String(c.nuevo)    : null,
    }))
    await supabase.from('historial_afiliados').insert(rows)
  }

  async function eliminarAfiliado(motivo) {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'admin'
    // Save audit record first
    await supabase.from('auditoria_eliminaciones').insert({
      tabla: 'afiliados',
      registro_id: selected.id,
      datos_previos: selected,
      motivo,
      usuario_email: email
    })
    await supabase.from('afiliados').delete().eq('id', selected.id)
    closeModal()
    await fetch()
  }

  async function fetchHistorial(id) {
    setLoadingHist(true)
    const { data } = await supabase
      .from('historial_afiliados')
      .select('*')
      .eq('afiliado_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    setHistorial(data || [])
    setLoadingHist(false)
  }

  function exportarExcel() {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => {
      const XLSX = window.XLSX
      const datos = filtered.map(a => ({
        'Nº Inscripción':      a.num_inscripcion,
        'Nombre':              a.nombre,
        'Apellidos':           a.apellidos,
        'DNI/NIE':             a.dni_nie,
        'Fecha Nacimiento':    a.fecha_nacimiento || '',
        'País Origen':         a.pais_origen || '',
        'Estado Civil':        a.estado_civil || '',
        'Dirección':           a.direccion || '',
        'Provincia':           a.provincia || '',
        'Teléfono':            a.telefono || '',
        'Email':               a.email || '',
        'Tipo Inscripción':    a.tipo_inscripcion === 'familia' ? 'Familia' : 'Individual',
        'Nº Miembros':         a.num_miembros || 1,
        'Padres Convivientes': a.padres_convivientes || 0,
        'Cuota Anual (€)':     calcularCuota(a.tipo_inscripcion, a.padres_convivientes),
        'Matrimonio Mixto':    a.matrimonio_mixto ? 'Sí' : 'No',
        'Estado':              a.estado,
        'Fecha Alta':          a.created_at ? new Date(a.created_at).toLocaleDateString('es-ES') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(datos)
      // Column widths
      ws['!cols'] = [
        {wch:14},{wch:18},{wch:20},{wch:14},{wch:16},{wch:16},
        {wch:14},{wch:30},{wch:12},{wch:16},{wch:26},{wch:16},
        {wch:12},{wch:18},{wch:14},{wch:14},{wch:10},{wch:12}
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Afiliados')
      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `UCIDGAL_Afiliados_${fecha}.xlsx`)
    }
    document.head.appendChild(script)
  }

  function exportarPDF() {
    const fecha = new Date().toLocaleDateString('es-ES')
    const filas = filtered.map(a => `
      <tr>
        <td>${a.num_inscripcion}</td>
        <td>${a.nombre} ${a.apellidos}</td>
        <td>${a.dni_nie}</td>
        <td>${a.provincia || '—'}</td>
        <td>${a.tipo_inscripcion === 'familia' ? 'Familia' : 'Individual'}</td>
        <td>${calcularCuota(a.tipo_inscripcion, a.padres_convivientes)}€</td>
        <td>${a.estado}</td>
      </tr>`).join('')
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Listado Afiliados UCIDGAL</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a18; margin: 2cm; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .header img { width: 40px; height: 40px; object-fit: contain; }
        .org { font-size: 15px; font-weight: 600; }
        .sub { font-size: 11px; color: #6b6b68; margin-top: 2px; }
        .meta { font-size: 11px; color: #6b6b68; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #29BAD4; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 6px 8px; border-bottom: 0.5px solid #e0e0e0; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .footer { margin-top: 16px; font-size: 10px; color: #6b6b68; text-align: center; }
        .badge { display:inline-block; padding: 1px 7px; border-radius: 20px; font-size: 10px; }
        .activo { background:#E8F8FC; color:#1A8FA6; }
        .pendiente { background:#FAEEDA; color:#633806; }
        .baja { background:#FCEBEB; color:#A32D2D; }
        @media print { body { margin: 1cm; } }
      </style></head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.png" alt="UCIDGAL" />
          <div>
            <div class="org">Fondo de Decesos y Repatriación – UCIDGAL</div>
            <div class="sub">Galicia, España</div>
          </div>
        </div>
        <div class="meta">
          Listado de afiliados · ${filtered.length} registros · Generado el ${fecha}
          ${filterEstado !== 'todos' ? ' · Filtro: ' + filterEstado : ''}
        </div>
        <table>
          <thead><tr><th>Nº</th><th>Nombre</th><th>DNI/NIE</th><th>Provincia</th><th>Tipo</th><th>Cuota</th><th>Estado</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="footer">UCIDGAL · contacto@ucidgal.org · Documento generado automáticamente</div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }
  function updateForm(k,v){ setForm(f => ({ ...f, [k]: v })) }

  function validarDNI(dni) {
    if (!dni) return 'El DNI/NIE es obligatorio'
    const nie = /^[XYZ][0-9]{7}[A-Z]$/i
    const dni_es = /^[0-9]{8}[A-Z]$/i
    const pasaporte = /^[A-Z]{2}[0-9]{6}$/i
    if (!nie.test(dni) && !dni_es.test(dni) && !pasaporte.test(dni) && dni.length < 6) return 'Formato no reconocido'
    return null
  }

  function validarPaso(p) {
    const e = {}
    if (p === 1) {
      if (!form.nombre?.trim())    e.nombre    = 'El nombre es obligatorio'
      if (!form.apellidos?.trim()) e.apellidos = 'Los apellidos son obligatorios'
      if (!form.dni_nie?.trim())   e.dni_nie   = 'El DNI/NIE es obligatorio'
      else { const err = validarDNI(form.dni_nie); if (err) e.dni_nie = err }
      if (!form.fecha_nacimiento)  e.fecha_nacimiento = 'La fecha de nacimiento es obligatoria'
      else {
        const edad = Math.floor((new Date() - new Date(form.fecha_nacimiento)) / (365.25 * 86400000))
        if (edad < 0 || edad > 120) e.fecha_nacimiento = 'Fecha no válida'
      }
      if (!form.pais_origen?.trim()) e.pais_origen = 'El país de origen es obligatorio'
    }
    if (p === 2) {
      if (!form.direccion?.trim()) e.direccion = 'La dirección es obligatoria'
      if (!form.provincia)         e.provincia = 'Selecciona una provincia'
      if (!form.telefono?.trim())  e.telefono  = 'El teléfono es obligatorio'
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email no válido'
    }
    if (p === 3) {
      const tiposLabel = { conyuge: 'Cónyuge', padre: 'Padre/Madre', hijo: 'Hijo/a' }
      ;(form.hijos || []).forEach((h, i) => {
        const label = tiposLabel[h.tipo] || 'Miembro'
        if (!h.nombre?.trim())           e[`miembro_${i}_nombre`]   = `${label} ${i+1}: el nombre es obligatorio`
        if (!h.apellidos?.trim())        e[`miembro_${i}_apellidos`] = `${label} ${i+1}: los apellidos son obligatorios`
        if (!h.dni_nie?.trim())          e[`miembro_${i}_dni`]       = `${label} ${i+1}: el DNI/NIE es obligatorio`
        if (!h.fecha_nacimiento)         e[`miembro_${i}_fecha`]     = `${label} ${i+1}: la fecha de nacimiento es obligatoria`
      })
    }
    return e
  }

  function avanzarPaso() {
    const e = validarPaso(paso)
    if (Object.keys(e).length > 0) { setErrores(e); return }
    setErrores({})
    setPaso(p => p + 1)
  }

  function retrocederPaso() { setPaso(p => p - 1); setErrores({}) }

  function fieldError(campo) {
    return errores[campo]
      ? <span style={{fontSize:'11px',color:'var(--danger-tx)',marginTop:'3px',display:'block'}}>{errores[campo]}</span>
      : null
  }

  function fieldStyle(campo) {
    return errores[campo] ? {borderColor:'var(--danger-tx)',boxShadow:'0 0 0 3px rgba(163,45,45,0.1)'} : {}
  }

  function addMiembro(tipo) {
    setForm(f => ({ ...f, hijos: [...(f.hijos || []), { tipo, nombre: '', apellidos: '', dni_nie: '', fecha_nacimiento: '' }] }))
  }
  function updateHijo(i, campo, val) {
    setForm(f => {
      const hijos = [...(f.hijos || [])]
      hijos[i] = { ...hijos[i], [campo]: val }
      return { ...f, hijos }
    })
  }
  function removeHijo(i) {
    setForm(f => ({ ...f, hijos: (f.hijos || []).filter((_, idx) => idx !== i) }))
  }

  async function openTarjeta(a) {
    const { data } = await supabase
      .from('cuotas').select('fecha_pago').eq('afiliado_id', a.id)
      .eq('estado', 'pagado').eq('anio', new Date().getFullYear())
      .order('fecha_pago', { ascending: false }).limit(1)
    setUltimoPago(data?.[0]?.fecha_pago || null)
    setTarjeta(a)
  }

  async function guardar() {
    // Validate all steps before saving (important for edit mode)
    const erroresTodos = { ...validarPaso(1), ...validarPaso(2), ...validarPaso(3) }
    if (Object.keys(erroresTodos).length > 0) {
      setErrores(erroresTodos)
      // Navigate to the first step with errors
      const tieneErroresPaso1 = Object.keys(erroresTodos).some(k => ['nombre','apellidos','dni_nie','fecha_nacimiento','pais_origen'].includes(k))
      const tieneErroresPaso2 = Object.keys(erroresTodos).some(k => ['direccion','provincia','telefono','email'].includes(k))
      if (tieneErroresPaso1) setPaso(1)
      else if (tieneErroresPaso2) setPaso(2)
      else setPaso(3)
      setMsg({ type: 'error', text: 'Hay campos obligatorios sin rellenar. Revisa todos los pasos.' })
      setSaving(false)
      return
    }
    // Check DNI/NIE duplicate before saving
    if (form.dni_nie && form.dni_nie.trim()) {
      const query = supabase.from('afiliados').select('id, nombre, apellidos, num_inscripcion').eq('dni_nie', form.dni_nie.trim().toUpperCase())
      if (modal === 'editar') query.neq('id', selected.id)
      const { data: existe } = await query.maybeSingle()
      if (existe) {
        setMsg({ type: 'error', text: `Este DNI/NIE ya está registrado — ${existe.nombre} ${existe.apellidos} (Nº ${existe.num_inscripcion}).` })
        setSaving(false)
        return
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'admin'
    const payload = {
      ...form,
      dni_nie: form.dni_nie?.trim().toUpperCase(),
      num_miembros: 1 + (form.hijos?.filter(h => h.nombre?.trim()).length || 0),
      num_inscripcion: modal === 'nuevo' ? genNumInscripcion(afiliados.length) : form.num_inscripcion,
      updated_at: new Date().toISOString()
    }
    const { data: result, error } = modal === 'nuevo'
      ? await supabase.from('afiliados').insert(payload).select().single()
      : await supabase.from('afiliados').update(payload).eq('id', selected.id).select().single()

    if (error) {
      const msg = error.code === '23505' || error.message?.includes('dni_nie')
        ? 'Este DNI/NIE ya está registrado en el sistema.'
        : 'Error al guardar: ' + error.message
      setMsg({ type: 'error', text: msg })
    } else {
      // Track changes
      const camposLabel = {
        nombre:'Nombre', apellidos:'Apellidos', dni_nie:'DNI/NIE',
        fecha_nacimiento:'Fecha nacimiento', pais_origen:'País origen',
        estado_civil:'Estado civil', direccion:'Dirección', provincia:'Provincia',
        telefono:'Teléfono', email:'Email', tipo_inscripcion:'Tipo inscripción',
        num_miembros:'Nº miembros', padres_convivientes:'Padres convivientes',
        estado:'Estado', matrimonio_mixto:'Matrimonio mixto'
      }
      if (modal === 'nuevo') {
        await registrarHistorial(result.id, 'creacion', [{ campo: 'registro', anterior: null, nuevo: 'Alta en el sistema' }], email)
      } else {
        const cambios = Object.keys(camposLabel)
          .filter(k => String(selected[k] || '') !== String(form[k] || ''))
          .map(k => ({ campo: camposLabel[k], anterior: selected[k], nuevo: form[k] }))
        if (cambios.length > 0)
          await registrarHistorial(selected.id, cambios.some(c => c.campo === 'Estado') ? 'cambio_estado' : 'edicion', cambios, email)
      }
      setMsg({ type: 'success', text: modal === 'nuevo' ? 'Afiliado registrado.' : 'Cambios guardados.' })
      await fetch()
      setTimeout(closeModal, 1200)
    }
    setSaving(false)
  }

  async function cambiarEstado(id, estadoAnterior, estadoNuevo) {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || 'admin'
    await supabase.from('afiliados').update({ estado: estadoNuevo, updated_at: new Date().toISOString() }).eq('id', id)
    await registrarHistorial(id, 'cambio_estado', [{ campo: 'Estado', anterior: estadoAnterior, nuevo: estadoNuevo }], email)
    fetch()
  }

  const cuota = calcularCuota(form.tipo_inscripcion, form.padres_convivientes)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Afiliados</div>
        <div className="page-subtitle">Registro y gestión de miembros del fondo</div>
      </div>

      {/* Toolbar principal */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Buscar por nombre, DNI/NIE..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn" onClick={() => setFiltrosAbiertos(f => !f)}
            style={filtrosActivos > 0 ? {borderColor:'var(--accent)',color:'var(--accent)'} : {}}>
            <svg style={{width:'13px',height:'13px'}} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L13 9.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-7.586L3.293 5.707A1 1 0 013 5V3z" clipRule="evenodd"/>
            </svg>
            Filtros{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
          </button>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn" onClick={exportarExcel} title="Exportar a Excel">
            <svg style={{width:'14px',height:'14px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm2 0v12h10V4H5zm2 2h6v2H7V6zm0 4h6v2H7v-2zm0 4h4v2H7v-2z" clipRule="evenodd"/></svg>
            Excel
          </button>
          <button className="btn" onClick={exportarPDF} title="Exportar a PDF">
            <svg style={{width:'14px',height:'14px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
            PDF
          </button>
          <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo afiliado</button>
        </div>
      </div>

      {/* Panel de filtros avanzados */}
      {filtrosAbiertos && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'1rem',marginBottom:'1rem',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',alignItems:'end'}}>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={filterEstado} onChange={e => setFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de inscripción</label>
            <select className="form-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="familia">Familia</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">País de origen</label>
            <select className="form-select" value={filterPais} onChange={e => setFilterPais(e.target.value)}>
              <option value="todos">Todos los países</option>
              {paisesDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Año de alta</label>
            <select className="form-select" value={filterAnio} onChange={e => setFilterAnio(e.target.value)}>
              <option value="todos">Todos los años</option>
              {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'flex-end'}}>
            {filtrosActivos > 0 && (
              <button className="btn" style={{width:'100%',justifyContent:'center',color:'var(--accent)',borderColor:'var(--accent)'}} onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chips de filtros activos */}
      {filtrosActivos > 0 && (
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'0.75rem'}}>
          {filterEstado !== 'todos' && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'var(--accent-bg)',color:'var(--accent-dk)',display:'flex',alignItems:'center',gap:'5px'}}>Estado: {filterEstado} <button onClick={() => setFilter('todos')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-dk)',lineHeight:1,padding:0,fontSize:'13px'}}>×</button></span>}
          {filterTipo !== 'todos' && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'var(--accent-bg)',color:'var(--accent-dk)',display:'flex',alignItems:'center',gap:'5px'}}>Tipo: {filterTipo} <button onClick={() => setFilterTipo('todos')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-dk)',lineHeight:1,padding:0,fontSize:'13px'}}>×</button></span>}
          {filterPais !== 'todos' && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'var(--accent-bg)',color:'var(--accent-dk)',display:'flex',alignItems:'center',gap:'5px'}}>País: {filterPais} <button onClick={() => setFilterPais('todos')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-dk)',lineHeight:1,padding:0,fontSize:'13px'}}>×</button></span>}
          {filterAnio !== 'todos' && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'var(--accent-bg)',color:'var(--accent-dk)',display:'flex',alignItems:'center',gap:'5px'}}>Año: {filterAnio} <button onClick={() => setFilterAnio('todos')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent-dk)',lineHeight:1,padding:0,fontSize:'13px'}}>×</button></span>}
        </div>
      )}

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando...</span></div>
          : <div className="table-wrap">
              <table>
                <thead><tr><th>Nº</th><th>Nombre</th><th>DNI/NIE</th><th>Provincia</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>
                        {search ? 'Sin resultados.' : 'No hay afiliados registrados.'}
                      </td></tr>
                    : filtered.map(a => (
                      <tr key={a.id}>
                        <td className="mono">{a.num_inscripcion}</td>
                        <td style={{fontWeight:500}}>{a.nombre} {a.apellidos}</td>
                        <td className="mono">{a.dni_nie}</td>
                        <td><span className="prov-tag">{a.provincia}</span></td>
                        <td style={{color:'var(--muted)'}}>{a.tipo_inscripcion === 'familia' ? 'Familia' : 'Individual'}</td>
                        <td><span className={`badge badge-${a.estado}`}>{a.estado.charAt(0).toUpperCase()+a.estado.slice(1)}</span></td>
                        <td style={{display:'flex',gap:'6px'}}>
                          <button className="btn btn-sm" onClick={() => openDetalle(a)}>Ver</button>
                          <button className="btn btn-sm" onClick={() => openEditar(a)}>Editar</button>
                          <button className="btn btn-sm" onClick={() => openTarjeta(a)} title="Tarjeta virtual">🪪</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </div>
      <p style={{fontSize:'12px',color:'var(--muted)',textAlign:'right'}}>{filtered.length} afiliado(s)</p>

      {(modal === 'nuevo' || modal === 'editar') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{maxWidth:'580px'}}>

            {/* Header */}
            <div className="modal-header">
              <div>
                <div className="modal-title">{modal === 'nuevo' ? 'Nuevo afiliado' : 'Editar afiliado'}</div>
                <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>
                  Paso {paso} de 3 · {['Datos personales','Contacto y ubicación','Inscripción'][paso-1]}
                </div>
              </div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            {/* Progress bar */}
            <div style={{height:'3px',background:'var(--border)',position:'relative'}}>
              <div style={{height:'100%',background:'var(--accent)',borderRadius:'2px',transition:'width 0.3s ease',width:`${(paso/3)*100}%`}}/>
            </div>

            {/* Step indicators */}
            <div style={{display:'flex',padding:'1rem 1.5rem 0',gap:'0'}}>
              {[['1','Datos personales'],['2','Contacto'],['3','Inscripción']].map(([n, label], i) => {
                const num = i + 1
                const activo = num === paso
                const completo = num < paso
                return (
                  <div key={n} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',position:'relative'}}>
                    {i > 0 && <div style={{position:'absolute',top:'12px',left:0,right:'50%',height:'1px',background: completo || activo ? 'var(--accent)' : 'var(--border)'}}/>}
                    {i < 2 && <div style={{position:'absolute',top:'12px',left:'50%',right:0,height:'1px',background: num < paso ? 'var(--accent)' : 'var(--border)'}}/>}
                    <div style={{
                      width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:'11px',fontWeight:500,zIndex:1,transition:'all 0.2s',
                      background: completo ? 'var(--accent)' : activo ? 'var(--accent)' : 'var(--bg)',
                      color: completo || activo ? '#fff' : 'var(--muted)',
                      border: `2px solid ${completo || activo ? 'var(--accent)' : 'var(--border)'}`
                    }}>
                      {completo ? '✓' : n}
                    </div>
                    <span style={{fontSize:'10px',color: activo ? 'var(--accent)' : 'var(--muted)',fontWeight: activo ? 500 : 400,textAlign:'center'}}>{label}</span>
                  </div>
                )
              })}
            </div>

            <div className="modal-body" style={{paddingTop:'1.25rem'}}>
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}

              {/* PASO 1 — Datos personales */}
              {paso === 1 && (
                <div>
                  <div className="form-grid" style={{marginBottom:'1rem'}}>
                    <div className="form-group">
                      <label className="form-label">Nombre <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" value={form.nombre} autoFocus
                        style={fieldStyle('nombre')}
                        onChange={e => { updateForm('nombre', e.target.value); if(errores.nombre) setErrores(er=>({...er,nombre:null})) }}
                        placeholder="Nombre" />
                      {fieldError('nombre')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apellidos <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" value={form.apellidos}
                        style={fieldStyle('apellidos')}
                        onChange={e => { updateForm('apellidos', e.target.value); if(errores.apellidos) setErrores(er=>({...er,apellidos:null})) }}
                        placeholder="Apellidos" />
                      {fieldError('apellidos')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">DNI / NIE / Pasaporte <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" value={form.dni_nie}
                        style={fieldStyle('dni_nie')}
                        onChange={e => { updateForm('dni_nie', e.target.value.toUpperCase()); if(errores.dni_nie) setErrores(er=>({...er,dni_nie:null})) }}
                        placeholder="X0000000X" />
                      {fieldError('dni_nie')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha de nacimiento <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" type="date" value={form.fecha_nacimiento}
                        style={fieldStyle('fecha_nacimiento')}
                        onChange={e => { updateForm('fecha_nacimiento', e.target.value); if(errores.fecha_nacimiento) setErrores(er=>({...er,fecha_nacimiento:null})) }} />
                      {fieldError('fecha_nacimiento')}
                      {form.fecha_nacimiento && !errores.fecha_nacimiento && (
                        <span style={{fontSize:'11px',color:'var(--muted)',marginTop:'3px',display:'block'}}>
                          {Math.floor((new Date() - new Date(form.fecha_nacimiento)) / (365.25*86400000))} años
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">País de origen <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" value={form.pais_origen}
                        style={fieldStyle('pais_origen')}
                        onChange={e => { updateForm('pais_origen', e.target.value); if(errores.pais_origen) setErrores(er=>({...er,pais_origen:null})) }}
                        placeholder="Marruecos, Argelia, Senegal..." />
                      {fieldError('pais_origen')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado civil</label>
                      <select className="form-select" value={form.estado_civil} onChange={e => updateForm('estado_civil', e.target.value)}>
                        {ESTADOS_CIVILES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{background:'var(--bg)',borderRadius:'var(--radius-sm)',padding:'10px 14px',fontSize:'12px',color:'var(--muted)'}}>
                    <span style={{color:'var(--danger-tx)'}}>*</span> Campos obligatorios
                  </div>
                </div>
              )}

              {/* PASO 2 — Contacto y ubicación */}
              {paso === 2 && (
                <div>
                  <div className="form-grid" style={{marginBottom:'1rem'}}>
                    <div className="form-group full">
                      <label className="form-label">Dirección completa <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" value={form.direccion}
                        style={fieldStyle('direccion')}
                        onChange={e => { updateForm('direccion', e.target.value); if(errores.direccion) setErrores(er=>({...er,direccion:null})) }}
                        placeholder="Calle, número, piso, código postal, ciudad..." autoFocus />
                      {fieldError('direccion')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Provincia <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <select className="form-select" value={form.provincia}
                        style={fieldStyle('provincia')}
                        onChange={e => { updateForm('provincia', e.target.value); if(errores.provincia) setErrores(er=>({...er,provincia:null})) }}>
                        <option value="">— Selecciona —</option>
                        {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                      </select>
                      {fieldError('provincia')}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono <span style={{color:'var(--danger-tx)'}}>*</span></label>
                      <input className="form-input" type="tel" value={form.telefono}
                        style={fieldStyle('telefono')}
                        onChange={e => { updateForm('telefono', e.target.value); if(errores.telefono) setErrores(er=>({...er,telefono:null})) }}
                        placeholder="+34 600 000 000" />
                      {fieldError('telefono')}
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={form.email}
                        style={fieldStyle('email')}
                        onChange={e => { updateForm('email', e.target.value); if(errores.email) setErrores(er=>({...er,email:null})) }}
                        placeholder="correo@ejemplo.com" />
                      {fieldError('email')}
                      <span className="form-hint">Opcional · para notificaciones de renovación</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3 — Inscripción y cuota */}
              {paso === 3 && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'1rem'}}>
                    {[
                      {val:'familia', titulo:'Familia', desc:'Matrimonio + hijos menores', precio:'50€/año'},
                      {val:'individual', titulo:'Individual', desc:'Mayor de 18 años, soltero o independiente', precio:'25€/año'},
                    ].map(opt => (
                      <div key={opt.val} onClick={() => updateForm('tipo_inscripcion', opt.val)}
                        style={{
                          padding:'14px',borderRadius:'var(--radius)',cursor:'pointer',transition:'all 0.15s',
                          border: form.tipo_inscripcion === opt.val ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: form.tipo_inscripcion === opt.val ? 'var(--accent-bg)' : 'var(--surface)'
                        }}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                          <span style={{fontSize:'13px',fontWeight:500,color: form.tipo_inscripcion === opt.val ? 'var(--accent-dk)' : 'var(--text)'}}>{opt.titulo}</span>
                          <span style={{fontSize:'13px',fontWeight:500,color:'var(--accent)'}}>{opt.precio}</span>
                        </div>
                        <div style={{fontSize:'11px',color:'var(--muted)'}}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="form-grid-3" style={{marginBottom:'1rem'}}>
                    <div className="form-group">
                      <label className="form-label">Nº miembros familia</label>
                      <input className="form-input" type="number" min="1" max="20" value={form.num_miembros || 1}
                        onChange={e => updateForm('num_miembros', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Padres convivientes</label>
                      <input className="form-input" type="number" min="0" max="2" value={form.padres_convivientes || 0}
                        onChange={e => updateForm('padres_convivientes', e.target.value)} />
                      <span className="form-hint">+25€ por progenitor (Art. 5)</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estado inicial</label>
                      <select className="form-select" value={form.estado} onChange={e => updateForm('estado', e.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="activo">Activo</option>
                      </select>
                    </div>
                  </div>

                  {/* Unidad familiar */}
                  {(form.tipo_inscripcion === 'familia' || Number(form.padres_convivientes) > 0) && (
                    <div style={{marginBottom:'1rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                        <label className="form-label" style={{margin:0}}>
                          {form.tipo_inscripcion === 'familia' ? 'Miembros de la unidad familiar' : 'Padres convivientes'}
                        </label>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end'}}>
                          {form.tipo_inscripcion === 'familia' && (
                            <button className="btn btn-sm" onClick={() => addMiembro('conyuge')} type="button"
                              style={{fontSize:'11px',color:'var(--accent)',borderColor:'var(--accent)'}}>
                              + Cónyuge
                            </button>
                          )}
                          {form.tipo_inscripcion === 'familia' && (
                            <button className="btn btn-sm" onClick={() => addMiembro('hijo')} type="button"
                              style={{fontSize:'11px',color:'var(--accent)',borderColor:'var(--accent)'}}>
                              + Hijo/a
                            </button>
                          )}
                          {Number(form.padres_convivientes) > 0 &&
                            (form.hijos||[]).filter(h=>h.tipo==='padre').length < Number(form.padres_convivientes) && (
                            <button className="btn btn-sm" onClick={() => addMiembro('padre')} type="button"
                              style={{fontSize:'11px',color:'var(--accent)',borderColor:'var(--accent)'}}>
                              + Padre/Madre ({(form.hijos||[]).filter(h=>h.tipo==='padre').length}/{form.padres_convivientes})
                            </button>
                          )}
                        </div>
                      </div>
                      {(!form.hijos || form.hijos.length === 0)
                        ? <div style={{padding:'10px 14px',background:'var(--bg)',borderRadius:'var(--radius-sm)',fontSize:'12px',color:'var(--muted)',textAlign:'center'}}>
{form.tipo_inscripcion === 'familia' ? 'Añade el cónyuge e hijos menores cubiertos por esta inscripción.' : 'Usa el botón + Padre/Madre para añadir los padres convivientes.'}
                          </div>
                        : <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                            {form.hijos.map((h, i) => {
                              const esConyuge = h.tipo === 'conyuge'
                              const esPadre   = h.tipo === 'padre'
                              const edad = h.fecha_nacimiento ? Math.floor((new Date() - new Date(h.fecha_nacimiento)) / (365.25*86400000)) : null
                              return (
                                <div key={i} style={{padding:'10px 12px',background:'var(--bg)',borderRadius:'var(--radius-sm)',border:`0.5px solid ${esConyuge ? 'var(--accent)' : 'var(--border)'}`}}>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                                    <span style={{fontSize:'11px',fontWeight:500,padding:'2px 8px',borderRadius:'20px',
                                      background: esConyuge ? 'var(--accent-bg)' : esPadre ? 'var(--info-bg)' : 'var(--bg)',
                                      color: esConyuge ? 'var(--accent-dk)' : esPadre ? 'var(--info-tx)' : 'var(--muted)',
                                      border:`0.5px solid ${esConyuge ? 'var(--accent)' : esPadre ? 'var(--info-tx)' : 'var(--border)'}`}}>
                                      {esConyuge ? 'Cónyuge' : esPadre ? 'Padre/Madre' : 'Hijo/a'}
                                    </span>
                                    <button onClick={() => removeHijo(i)} type="button"
                                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'16px',padding:'2px 4px'}}>✕</button>
                                  </div>
                                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                                    <div className="form-group" style={{margin:0}}>
                                      <label className="form-label">Nombre <span style={{color:'var(--danger-tx)'}}>*</span></label>
                                      <input className="form-input" value={h.nombre || ''}
                                        style={errores[`miembro_${i}_nombre`]?{borderColor:'var(--danger-tx)'}:{}}
                                        onChange={e => { updateHijo(i, 'nombre', e.target.value); setErrores(er=>({...er,[`miembro_${i}_nombre`]:null})) }} placeholder="Nombre" />
                                      {errores[`miembro_${i}_nombre`] && <span style={{fontSize:'10px',color:'var(--danger-tx)'}}>{errores[`miembro_${i}_nombre`]}</span>}
                                    </div>
                                    <div className="form-group" style={{margin:0}}>
                                      <label className="form-label">Apellidos <span style={{color:'var(--danger-tx)'}}>*</span></label>
                                      <input className="form-input" value={h.apellidos || ''}
                                        style={errores[`miembro_${i}_apellidos`]?{borderColor:'var(--danger-tx)'}:{}}
                                        onChange={e => { updateHijo(i, 'apellidos', e.target.value); setErrores(er=>({...er,[`miembro_${i}_apellidos`]:null})) }} placeholder="Apellidos" />
                                      {errores[`miembro_${i}_apellidos`] && <span style={{fontSize:'10px',color:'var(--danger-tx)'}}>{errores[`miembro_${i}_apellidos`]}</span>}
                                    </div>
                                    <div className="form-group" style={{margin:0}}>
                                      <label className="form-label">DNI / NIE <span style={{color:'var(--danger-tx)'}}>*</span></label>
                                      <input className="form-input" value={h.dni_nie || ''}
                                        style={errores[`miembro_${i}_dni`]?{borderColor:'var(--danger-tx)'}:{}}
                                        onChange={e => { updateHijo(i, 'dni_nie', e.target.value.toUpperCase()); setErrores(er=>({...er,[`miembro_${i}_dni`]:null})) }} placeholder="X0000000X" />
                                      {errores[`miembro_${i}_dni`] && <span style={{fontSize:'10px',color:'var(--danger-tx)'}}>{errores[`miembro_${i}_dni`]}</span>}
                                    </div>
                                    <div className="form-group" style={{margin:0}}>
                                      <label className="form-label">Fecha de nacimiento <span style={{color:'var(--danger-tx)'}}>*</span></label>
                                      <input className="form-input" type="date" value={h.fecha_nacimiento || ''}
                                        style={errores[`miembro_${i}_fecha`]?{borderColor:'var(--danger-tx)'}:{}}
                                        onChange={e => { updateHijo(i, 'fecha_nacimiento', e.target.value); setErrores(er=>({...er,[`miembro_${i}_fecha`]:null})) }} />
                                      {errores[`miembro_${i}_fecha`] && <span style={{fontSize:'10px',color:'var(--danger-tx)'}}>{errores[`miembro_${i}_fecha`]}</span>}
                                      {edad !== null && !errores[`miembro_${i}_fecha`] && (
                                        <span style={{fontSize:'10px',color: (h.tipo==='hijo' && edad >= 18) ? 'var(--danger-tx)' : 'var(--muted)',marginTop:'2px',display:'block'}}>
                                          {edad} años{h.tipo==='hijo' && edad >= 18 ? ' · Mayor de edad — no cubierto' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                      }
                      {form.hijos?.some(h => h.tipo === 'hijo' && h.fecha_nacimiento && Math.floor((new Date()-new Date(h.fecha_nacimiento))/(365.25*86400000)) >= 18) && (
                        <div className="alert alert-warn" style={{marginTop:'8px',marginBottom:0,fontSize:'12px'}}>
                          Uno o más hijos han cumplido 18 años. Según el reglamento (Art. 6) deben inscribirse de forma individual.
                        </div>
                      )}
                      {Number(form.padres_convivientes) > 0 && (form.hijos||[]).filter(h=>h.tipo==='padre').length < Number(form.padres_convivientes) && (
                        <div className="alert alert-warn" style={{marginTop:'8px',marginBottom:0,fontSize:'12px'}}>
                          Has indicado {form.padres_convivientes} padre(s) conviviente(s) pero solo hay {(form.hijos||[]).filter(h=>h.tipo==='padre').length} registrado(s). Usa el botón "+ Padre/Madre" para añadirlos.
                        </div>
                      )}

                    </div>
                  )}

                  <div className="cuota-box" style={{marginBottom:'1rem'}}>
                    <div>
                      <div style={{fontSize:'12px',color:'var(--accent-dk)',fontWeight:500}}>Cuota anual calculada</div>
                      <div style={{fontSize:'11px',color:'var(--accent-dk)',opacity:0.8,marginTop:'2px'}}>
  {form.tipo_inscripcion === 'familia' ? `50€ base · ${2 + (form.hijos?.filter(h=>h.nombre?.trim()).length||0)} miembros` : '25€ base'}
                        {Number(form.padres_convivientes) > 0 ? ` + ${Number(form.padres_convivientes) * 25}€ (${form.padres_convivientes} progenitor${form.padres_convivientes > 1 ? 'es' : ''})` : ''}
                      </div>
                    </div>
                    <strong style={{fontSize:'24px'}}>{cuota}€</strong>
                  </div>

                  <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 14px',marginBottom:'1rem'}}>
                    <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}}>
                      <input type="checkbox" checked={form.matrimonio_mixto} onChange={e => updateForm('matrimonio_mixto', e.target.checked)} style={{marginTop:'2px'}} />
                      <div>
                        <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>Matrimonio mixto (Art. 15)</div>
                        <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>El cónyuge deberá aportar acta notarial indicando su voluntad de sepultura</div>
                      </div>
                    </label>
                  </div>

                  {/* Resumen final */}
                  <div style={{background:'var(--bg)',borderRadius:'var(--radius)',padding:'12px 14px',fontSize:'12px'}}>
                    <div style={{fontWeight:500,color:'var(--text)',marginBottom:'8px',fontSize:'13px'}}>Resumen de la inscripción</div>
                    {[
                      ['Nombre', `${form.nombre} ${form.apellidos}`],
                      ['DNI/NIE', form.dni_nie],
                      ['Provincia', form.provincia],
                      ['Teléfono', form.telefono],
                      ['Tipo', form.tipo_inscripcion === 'familia' ? 'Familia' : 'Individual'],
                      ['Total miembros', form.tipo_inscripcion === 'familia' ? `${2 + (form.hijos?.filter(h=>h.nombre).length||0)} (2 cónyuges + ${form.hijos?.filter(h=>h.nombre).length||0} hijos)` : '1'],
                      ['Cuota anual', `${cuota}€`],
                      form.hijos?.filter(h=>h.tipo==='conyuge'&&h.nombre).length > 0
                        ? ['Cónyuge', form.hijos.filter(h=>h.tipo==='conyuge').map(h=>`${h.nombre} ${h.apellidos||''}`).join(', ')]
                        : null,
                      form.hijos?.filter(h=>h.tipo==='padre'&&h.nombre).length > 0
                        ? ['Padres convivientes', form.hijos.filter(h=>h.tipo==='padre'&&h.nombre).map(h=>`${h.nombre} ${h.apellidos||''}`).join(', ')]
                        : null,
                      form.hijos?.filter(h=>h.tipo==='hijo'&&h.nombre).length > 0
                        ? ['Hijos', form.hijos.filter(h=>h.tipo==='hijo'&&h.nombre).map(h=>h.nombre).join(', ')]
                        : ['Hijos', 'Ninguno'],
                    ].filter(Boolean).map(([l,v]) => (
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'0.5px solid var(--border)'}}>
                        <span style={{color:'var(--muted)'}}>{l}</span>
                        <span style={{fontWeight:500,color:'var(--text)'}}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer con navegación */}
            <div className="modal-footer" style={{justifyContent:'space-between'}}>
              <button className="btn" onClick={paso === 1 ? closeModal : retrocederPaso}>
                {paso === 1 ? 'Cancelar' : '← Anterior'}
              </button>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{fontSize:'11px',color:'var(--muted)'}}>{paso}/3</span>
                {paso < 3
                  ? <button className="btn btn-primary" onClick={avanzarPaso}>Siguiente →</button>
                  : <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                      {saving ? 'Guardando...' : modal === 'nuevo' ? '✓ Registrar afiliado' : '✓ Guardar cambios'}
                    </button>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{maxWidth:'620px'}}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selected.nombre} {selected.apellidos}</div>
                <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px'}}>Nº {selected.num_inscripcion} · <span className={`badge badge-${selected.estado}`} style={{fontSize:'10px'}}>{selected.estado}</span></div>
              </div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',borderBottom:'1px solid var(--border)',padding:'0 1.5rem'}}>
              {[['datos','Datos'],['historial','Historial']].map(([tab, label]) => (
                <button key={tab} onClick={() => { setTabDetalle(tab); if (tab === 'historial' && historial.length === 0) fetchHistorial(selected.id) }}
                  style={{padding:'10px 16px',fontSize:'13px',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-sans)',
                    borderBottom: tabDetalle === tab ? '2px solid var(--accent)' : '2px solid transparent',
                    color: tabDetalle === tab ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: tabDetalle === tab ? 500 : 400, marginBottom:'-1px'}}>
                  {label}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {tabDetalle === 'datos' && (
                <>
                  {[
                    ['Nº inscripción', selected.num_inscripcion],
                    ['DNI / NIE / Pasaporte', selected.dni_nie],
                    ['Fecha de nacimiento', selected.fecha_nacimiento],
                    ['País de origen', selected.pais_origen],
                    ['Estado civil', selected.estado_civil],
                    ['Dirección', selected.direccion],
                    ['Provincia', selected.provincia],
                    ['Teléfono', selected.telefono],
                    ['Email', selected.email],
                    ['Tipo', selected.tipo_inscripcion === 'familia' ? 'Familia' : 'Individual'],
                            ['Cuota anual', calcularCuota(selected.tipo_inscripcion, selected.padres_convivientes) + '€'],
                    ['Matrimonio mixto', selected.matrimonio_mixto ? 'Sí — acta notarial requerida' : 'No'],

                ['Unidad familiar', selected.hijos?.length > 0
                  ? <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                      {selected.hijos.map((h,i) => (
                        <div key={i} style={{fontSize:'12px',display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'20px',
                            background: h.tipo==='conyuge' ? 'var(--accent-bg)' : h.tipo==='padre' ? 'var(--info-bg)' : 'var(--bg)',
                            color: h.tipo==='conyuge' ? 'var(--accent-dk)' : h.tipo==='padre' ? 'var(--info-tx)' : 'var(--muted)',
                            border:'0.5px solid var(--border)',flexShrink:0}}>
                            {h.tipo === 'conyuge' ? 'Cónyuge' : h.tipo === 'padre' ? 'Padre/Madre' : 'Hijo/a'}
                          </span>
                          <span>{h.nombre} {h.apellidos || ''}</span>
                          {h.fecha_nacimiento && <span style={{color:'var(--muted)'}}>· {Math.floor((new Date()-new Date(h.fecha_nacimiento))/(365.25*86400000))} años</span>}
                        </div>
                      ))}
                    </div>
                  : 'Ninguno'
                ],
                    ['Última modificación', selected.updated_at ? new Date(selected.updated_at).toLocaleString('es-ES') : '—'],
                  ].map(([l, v]) => (
                    <div className="detail-row" key={l}><span className="detail-label">{l}</span><span>{v || '—'}</span></div>
                  ))}
                </>
              )}

              {tabDetalle === 'historial' && (
                <div>
                  {loadingHist
                    ? <div className="loading"><div className="spinner"/><span>Cargando historial...</span></div>
                    : historial.length === 0
                      ? <div style={{textAlign:'center',color:'var(--muted)',padding:'2rem',fontSize:'13px'}}>No hay cambios registrados todavía.</div>
                      : historial.map((h, i) => (
                        <div key={h.id} style={{display:'flex',gap:'12px',padding:'10px 0',borderBottom:'0.5px solid var(--border)'}}>
                          {/* Timeline dot */}
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                            <div style={{width:'8px',height:'8px',borderRadius:'50%',background: h.accion === 'creacion' ? 'var(--accent)' : h.accion === 'cambio_estado' ? '#EF9F27' : 'var(--muted)',marginTop:'4px'}}/>
                            {i < historial.length - 1 && <div style={{width:'1px',flex:1,background:'var(--border)',marginTop:'4px'}}/>}
                          </div>
                          {/* Content */}
                          <div style={{flex:1,minWidth:0,paddingBottom:'4px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'4px'}}>
                              <div style={{fontSize:'12px',fontWeight:500,color:'var(--text)'}}>
                                {h.accion === 'creacion'     && 'Alta en el sistema'}
                                {h.accion === 'edicion'      && `Edición: ${h.campo}`}
                                {h.accion === 'cambio_estado'&& `Cambio de estado: ${h.campo}`}
                                {h.accion === 'baja'         && 'Baja del fondo'}
                              </div>
                              <div style={{fontSize:'11px',color:'var(--muted)',flexShrink:0}}>
                                {new Date(h.created_at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                              </div>
                            </div>
                            {h.valor_anterior != null && h.valor_nuevo != null && h.accion !== 'creacion' && (
                              <div style={{fontSize:'11px',color:'var(--muted)',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                                <span style={{background:'var(--danger-bg)',color:'var(--danger-tx)',padding:'1px 7px',borderRadius:'4px',textDecoration:'line-through'}}>{h.valor_anterior || '(vacío)'}</span>
                                <span>→</span>
                                <span style={{background:'var(--accent-bg)',color:'var(--accent-dk)',padding:'1px 7px',borderRadius:'4px'}}>{h.valor_nuevo || '(vacío)'}</span>
                              </div>
                            )}
                            <div style={{fontSize:'11px',color:'var(--muted)',marginTop:'3px'}}>
                              Por: {h.usuario_email}
                            </div>
                          </div>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => setConfirmar({
                titulo: 'Dar de baja al afiliado',
                mensaje: `¿Confirmas que deseas dar de baja a ${selected.nombre} ${selected.apellidos}? Perderá el acceso a los servicios del fondo.`,
                labelConfirmar: 'Dar de baja',
                tipo: 'danger',
                accion: () => { cambiarEstado(selected.id, selected.estado, 'baja'); closeModal() }
              })}>Dar de baja</button>
              <button className="btn" style={{color:'var(--danger-tx)',borderColor:'rgba(163,45,45,0.3)'}}
                onClick={() => setEliminar({
                  tipo: 'Afiliado',
                  nombre: `${selected.nombre} ${selected.apellidos}`,
                  detalle: `Nº ${selected.num_inscripcion} · ${selected.dni_nie}`
                })}>
                <svg style={{width:'13px',height:'13px'}} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                Eliminar
              </button>
              <button className="btn" onClick={() => { closeModal(); openEditar(selected) }}>Editar</button>
              <button className="btn" onClick={() => { closeModal(); openTarjeta(selected) }}>🪪 Tarjeta</button>
              <button className="btn btn-primary" onClick={() => { cambiarEstado(selected.id, selected.estado, 'activo'); closeModal() }}>Marcar activo</button>
            </div>
          </div>
        </div>
      )}

      <ModalEliminar
        config={eliminar}
        onConfirmar={(motivo) => { eliminarAfiliado(motivo); setEliminar(null) }}
        onCancelar={() => setEliminar(null)}
      />

      <ModalConfirmar
        config={confirmar}
        onConfirmar={() => { confirmar?.accion(); setConfirmar(null) }}
        onCancelar={() => setConfirmar(null)}
      />

      {tarjeta && (
        <TarjetaVirtual
          afiliado={tarjeta}
          fechaPago={ultimoPago}
          onClose={() => { setTarjeta(null); setUltimoPago(null) }}
        />
      )}
    </div>
  )
}
