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
  estado: 'pendiente', matrimonio_mixto: false
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
          ].filter(Boolean).map(([l, v]) => (
            <div className="detail-row" key={l}>
              <span className="detail-label">{l}</span>
              <span>{v || '—'}</span>
            </div>
          ))}

          <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'1rem',padding:'8px',background:'var(--bg)',borderRadius:'var(--radius-sm)'}}>
            Tarjeta gratuita · Art. 9 y 10 del Reglamento UCIDGAL. Válida hasta el último día de febrero de {anio + 1}.
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

  function openNuevo()   { setForm(EMPTY_FORM); setModal('nuevo'); setMsg(null) }
  function openEditar(a) { setSelected(a); setForm({ ...a }); setModal('editar'); setMsg(null) }
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

  async function openTarjeta(a) {
    const { data } = await supabase
      .from('cuotas').select('fecha_pago').eq('afiliado_id', a.id)
      .eq('estado', 'pagado').eq('anio', new Date().getFullYear())
      .order('fecha_pago', { ascending: false }).limit(1)
    setUltimoPago(data?.[0]?.fecha_pago || null)
    setTarjeta(a)
  }

  async function guardar() {
    setSaving(true); setMsg(null)

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
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'nuevo' ? 'Nuevo afiliado' : 'Editar afiliado'}</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {msg && <div className={`alert alert-${msg.type}`} style={{marginBottom:'1rem'}}>{msg.text}</div>}
              <div className="form-section" style={{marginBottom:'1rem'}}>Datos personales</div>
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group"><label className="form-label">Nombre</label>
                  <input className="form-input" value={form.nombre} onChange={e => updateForm('nombre', e.target.value)} placeholder="Nombre" /></div>
                <div className="form-group"><label className="form-label">Apellidos</label>
                  <input className="form-input" value={form.apellidos} onChange={e => updateForm('apellidos', e.target.value)} placeholder="Apellidos" /></div>
                <div className="form-group"><label className="form-label">DNI / NIE / Pasaporte</label>
                  <input className="form-input" value={form.dni_nie} onChange={e => updateForm('dni_nie', e.target.value)} placeholder="X0000000X" /></div>
                <div className="form-group"><label className="form-label">Fecha de nacimiento</label>
                  <input className="form-input" type="date" value={form.fecha_nacimiento} onChange={e => updateForm('fecha_nacimiento', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">País de origen</label>
                  <input className="form-input" value={form.pais_origen} onChange={e => updateForm('pais_origen', e.target.value)} placeholder="Marruecos, Argelia..." /></div>
                <div className="form-group"><label className="form-label">Estado civil</label>
                  <select className="form-select" value={form.estado_civil} onChange={e => updateForm('estado_civil', e.target.value)}>
                    {ESTADOS_CIVILES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="form-group full"><label className="form-label">Dirección completa</label>
                  <input className="form-input" value={form.direccion} onChange={e => updateForm('direccion', e.target.value)} placeholder="Calle, número, piso, ciudad..." /></div>
                <div className="form-group"><label className="form-label">Provincia</label>
                  <select className="form-select" value={form.provincia} onChange={e => updateForm('provincia', e.target.value)}>
                    {PROVINCIAS.map(p => <option key={p}>{p}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Teléfono</label>
                  <input className="form-input" type="tel" value={form.telefono} onChange={e => updateForm('telefono', e.target.value)} placeholder="+34 600 000 000" /></div>
                <div className="form-group full"><label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="correo@ejemplo.com" /></div>
              </div>
              <div className="form-section" style={{marginBottom:'1rem'}}>Inscripción y cuota</div>
              <div className="form-grid-3" style={{marginBottom:'1rem'}}>
                <div className="form-group"><label className="form-label">Tipo de inscripción</label>
                  <select className="form-select" value={form.tipo_inscripcion} onChange={e => updateForm('tipo_inscripcion', e.target.value)}>
                    <option value="familia">Familia (matrimonio + hijos)</option>
                    <option value="individual">Individual (25€)</option></select></div>
                <div className="form-group"><label className="form-label">Nº miembros</label>
                  <input className="form-input" type="number" min="1" value={form.num_miembros} onChange={e => updateForm('num_miembros', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Padres convivientes</label>
                  <input className="form-input" type="number" min="0" max="2" value={form.padres_convivientes} onChange={e => updateForm('padres_convivientes', e.target.value)} />
                  <span className="form-hint">+25€ por cada progenitor</span></div>
              </div>
              <div className="cuota-box" style={{marginBottom:'1rem'}}>
                <span style={{color:'var(--accent-dk)',fontSize:'13px'}}>Cuota anual según reglamento (Art. 5 y 6)</span>
                <strong>{cuota}€</strong>
              </div>
              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group"><label className="form-label">Estado</label>
                  <select className="form-select" value={form.estado} onChange={e => updateForm('estado', e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="activo">Activo</option>
                    <option value="baja">Baja</option></select></div>
                <div className="form-group" style={{justifyContent:'center'}}>
                  <label className="form-label">Matrimonio mixto (Art. 15)</label>
                  <label style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'8px',cursor:'pointer'}}>
                    <input type="checkbox" checked={form.matrimonio_mixto} onChange={e => updateForm('matrimonio_mixto', e.target.checked)} />
                    <span style={{fontSize:'13px'}}>Sí — requiere acta notarial</span></label></div>
              </div>
              {form.matrimonio_mixto && (
                <div className="alert alert-warn" style={{marginBottom:'1rem'}}>
                  Art. 15 · El cónyuge debe aportar acta notarial indicando su voluntad de sepultura antes de completar la inscripción.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar afiliado'}</button>
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
                    ['Nº miembros', selected.num_miembros],
                    ['Padres convivientes', selected.padres_convivientes],
                    ['Cuota anual', calcularCuota(selected.tipo_inscripcion, selected.padres_convivientes) + '€'],
                    ['Matrimonio mixto', selected.matrimonio_mixto ? 'Sí — acta notarial requerida' : 'No'],
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
