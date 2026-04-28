import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PROVINCIAS = ['A Coruña', 'Pontevedra', 'Lugo', 'Ourense']
const ESTADOS_CIVILES = ['Casado/a', 'Soltero/a', 'Viudo/a', 'Divorciado/a']

function calcularCuota(tipo, padres) {
  const base = tipo === 'individual' ? 25 : 50
  return base + (Number(padres) || 0) * 25
}

function genNumInscripcion(total) {
  return String(total + 1).padStart(4, '0')
}

const EMPTY_FORM = {
  nombre: '', apellidos: '', dni_nie: '', fecha_nacimiento: '',
  pais_origen: '', estado_civil: 'Casado/a', direccion: '',
  provincia: 'A Coruña', telefono: '', email: '',
  tipo_inscripcion: 'familia', num_miembros: 1, padres_convivientes: 0,
  estado: 'pendiente', matrimonio_mixto: false
}

export default function Afiliados() {
  const [afiliados, setAfiliados] = useState([])
  const [filtered, setFiltered]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterEstado, setFilter] = useState('todos')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | 'editar' | 'detalle'
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('afiliados').select('*').order('num_inscripcion')
    setAfiliados(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    let r = afiliados
    if (search) r = r.filter(a =>
      `${a.nombre} ${a.apellidos} ${a.dni_nie}`.toLowerCase().includes(search.toLowerCase())
    )
    if (filterEstado !== 'todos') r = r.filter(a => a.estado === filterEstado)
    setFiltered(r)
  }, [afiliados, search, filterEstado])

  function openNuevo() {
    setForm(EMPTY_FORM)
    setModal('nuevo')
    setMsg(null)
  }

  function openEditar(a) {
    setSelected(a)
    setForm({ ...a })
    setModal('editar')
    setMsg(null)
  }

  function openDetalle(a) {
    setSelected(a)
    setModal('detalle')
  }

  function closeModal() { setModal(null); setSelected(null) }

  function updateForm(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    setSaving(true)
    setMsg(null)
    const payload = {
      ...form,
      num_inscripcion: modal === 'nuevo' ? genNumInscripcion(afiliados.length) : form.num_inscripcion,
      updated_at: new Date().toISOString()
    }

    let error
    if (modal === 'nuevo') {
      ;({ error } = await supabase.from('afiliados').insert(payload))
    } else {
      ;({ error } = await supabase.from('afiliados').update(payload).eq('id', selected.id))
    }

    if (error) {
      setMsg({ type: 'error', text: 'Error al guardar: ' + error.message })
    } else {
      setMsg({ type: 'success', text: modal === 'nuevo' ? 'Afiliado registrado correctamente.' : 'Cambios guardados.' })
      await fetch()
      setTimeout(closeModal, 1200)
    }
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
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={openNuevo}>+ Nuevo afiliado</button>
      </div>

      <div className="card">
        {loading
          ? <div className="loading"><div className="spinner"/><span>Cargando afiliados...</span></div>
          : <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nº</th><th>Nombre</th><th>DNI/NIE</th>
                    <th>Provincia</th><th>Tipo</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>
                        {search ? 'No se encontraron resultados.' : 'No hay afiliados registrados aún.'}
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

      {/* Modal nuevo / editar */}
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
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" value={form.nombre} onChange={e => updateForm('nombre', e.target.value)} placeholder="Nombre" />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input className="form-input" value={form.apellidos} onChange={e => updateForm('apellidos', e.target.value)} placeholder="Apellidos" />
                </div>
                <div className="form-group">
                  <label className="form-label">DNI / NIE / Pasaporte</label>
                  <input className="form-input" value={form.dni_nie} onChange={e => updateForm('dni_nie', e.target.value)} placeholder="X0000000X" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de nacimiento</label>
                  <input className="form-input" type="date" value={form.fecha_nacimiento} onChange={e => updateForm('fecha_nacimiento', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">País de origen</label>
                  <input className="form-input" value={form.pais_origen} onChange={e => updateForm('pais_origen', e.target.value)} placeholder="Marruecos, Argelia..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado civil</label>
                  <select className="form-select" value={form.estado_civil} onChange={e => updateForm('estado_civil', e.target.value)}>
                    {ESTADOS_CIVILES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Dirección completa</label>
                  <input className="form-input" value={form.direccion} onChange={e => updateForm('direccion', e.target.value)} placeholder="Calle, número, piso, ciudad..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Provincia</label>
                  <select className="form-select" value={form.provincia} onChange={e => updateForm('provincia', e.target.value)}>
                    {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" type="tel" value={form.telefono} onChange={e => updateForm('telefono', e.target.value)} placeholder="+34 600 000 000" />
                </div>
                <div className="form-group full">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
              </div>

              <div className="form-section" style={{marginBottom:'1rem'}}>Inscripción y cuota</div>
              <div className="form-grid-3" style={{marginBottom:'1rem'}}>
                <div className="form-group">
                  <label className="form-label">Tipo de inscripción</label>
                  <select className="form-select" value={form.tipo_inscripcion} onChange={e => updateForm('tipo_inscripcion', e.target.value)}>
                    <option value="familia">Familia (matrimonio + hijos)</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nº miembros familia</label>
                  <input className="form-input" type="number" min="1" value={form.num_miembros} onChange={e => updateForm('num_miembros', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Padres convivientes</label>
                  <input className="form-input" type="number" min="0" max="2" value={form.padres_convivientes} onChange={e => updateForm('padres_convivientes', e.target.value)} />
                  <span className="form-hint">+25€ por cada padre</span>
                </div>
              </div>

              <div className="cuota-box" style={{marginBottom:'1rem'}}>
                <span style={{color:'var(--accent-dk)',fontSize:'13px'}}>Cuota anual estimada según reglamento</span>
                <strong>{cuota}€</strong>
              </div>

              <div className="form-grid" style={{marginBottom:'1rem'}}>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.estado} onChange={e => updateForm('estado', e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="activo">Activo</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div className="form-group" style={{justifyContent:'center'}}>
                  <label className="form-label">Matrimonio mixto</label>
                  <label style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'8px',cursor:'pointer'}}>
                    <input type="checkbox" checked={form.matrimonio_mixto} onChange={e => updateForm('matrimonio_mixto', e.target.checked)} />
                    <span style={{fontSize:'13px'}}>Sí (requiere acta notarial)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar afiliado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
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
                ['Matrimonio mixto', selected.matrimonio_mixto ? 'Sí (acta notarial requerida)' : 'No'],
                ['Estado', <span className={`badge badge-${selected.estado}`}>{selected.estado}</span>],
              ].map(([l, v]) => (
                <div className="detail-row" key={l}>
                  <span className="detail-label">{l}</span>
                  <span>{v || '—'}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => { cambiarEstado(selected.id, 'baja'); closeModal() }}>Dar de baja</button>
              <button className="btn" onClick={() => { closeModal(); openEditar(selected) }}>Editar</button>
              <button className="btn btn-primary" onClick={() => { cambiarEstado(selected.id, 'activo'); closeModal() }}>Marcar activo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
