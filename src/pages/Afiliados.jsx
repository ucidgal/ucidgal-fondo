import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)
  const [tarjeta, setTarjeta]     = useState(null)
  const [ultimoPago, setUltimoPago] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('afiliados').select('*').order('num_inscripcion')
    setAfiliados(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    let r = afiliados
    if (search) r = r.filter(a => `${a.nombre} ${a.apellidos} ${a.dni_nie}`.toLowerCase().includes(search.toLowerCase()))
    if (filterEstado !== 'todos') r = r.filter(a => a.estado === filterEstado)
    setFiltered(r)
  }, [afiliados, search, filterEstado])

  function openNuevo()   { setForm(EMPTY_FORM); setModal('nuevo'); setMsg(null) }
  function openEditar(a) { setSelected(a); setForm({ ...a }); setModal('editar'); setMsg(null) }
  function openDetalle(a){ setSelected(a); setModal('detalle') }
  function closeModal()  { setModal(null); setSelected(null) }
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
    const payload = {
      ...form,
      num_inscripcion: modal === 'nuevo' ? genNumInscripcion(afiliados.length) : form.num_inscripcion,
      updated_at: new Date().toISOString()
    }
    const { error } = modal === 'nuevo'
      ? await supabase.from('afiliados').insert(payload)
      : await supabase.from('afiliados').update(payload).eq('id', selected.id)

    if (error) { setMsg({ type: 'error', text: 'Error al guardar: ' + error.message }) }
    else { setMsg({ type: 'success', text: modal === 'nuevo' ? 'Afiliado registrado.' : 'Cambios guardados.' }); await fetch(); setTimeout(closeModal, 1200) }
    setSaving(false)
  }

  async function cambiarEstado(id, estado) {
    await supabase.from('afiliados').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    fetch()
  }

  const cuota = calcularCuota(form.tipo_inscripcion, form.padres_convivientes)

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Afiliados</div>
        <div className="page-subtitle">Registro y gestión de miembros del fondo</div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Buscar por nombre, DNI/NIE..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{width:'auto'}} value={filterEstado} onChange={e => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo afiliado</button>
      </div>

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
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{selected.nombre} {selected.apellidos}</div>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
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
                ['Estado', <span className={`badge badge-${selected.estado}`}>{selected.estado}</span>],
              ].map(([l, v]) => (
                <div className="detail-row" key={l}><span className="detail-label">{l}</span><span>{v || '—'}</span></div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => { cambiarEstado(selected.id, 'baja'); closeModal() }}>Dar de baja</button>
              <button className="btn" onClick={() => { closeModal(); openEditar(selected) }}>Editar</button>
              <button className="btn" onClick={() => { closeModal(); openTarjeta(selected) }}>🪪 Tarjeta</button>
              <button className="btn btn-primary" onClick={() => { cambiarEstado(selected.id, 'activo'); closeModal() }}>Marcar activo</button>
            </div>
          </div>
        </div>
      )}

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
