import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function highlight(text, query) {
  if (!query || !text) return text || '—'
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {String(text).slice(0, idx)}
      <mark style={{background:'#FEF08A',color:'#1a1a18',borderRadius:'2px',padding:'0 1px'}}>{String(text).slice(idx, idx + query.length)}</mark>
      {String(text).slice(idx + query.length)}
    </>
  )
}

export default function BuscadorGlobal() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ afiliados: [], cuotas: [], siniestros: [] })
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)
  const timerRef = useRef(null)
  const navigate = useNavigate()

  const total = results.afiliados.length + results.cuotas.length + results.siniestros.length

  const buscar = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults({ afiliados: [], cuotas: [], siniestros: [] }); return }
    setLoading(true)
    const like = `%${q}%`
    try {
    const [{ data: afs, error: errAfs }, { data: sins, error: errSins }, { data: cuotas, error: errCuotas }] = await Promise.all([
      supabase.from('afiliados')
        .select('id, num_inscripcion, nombre, apellidos, dni_nie, provincia, estado')
        .or(`nombre.ilike.${like},apellidos.ilike.${like},dni_nie.ilike.${like},num_inscripcion.ilike.${like}`)
        .limit(5),
      supabase.from('siniestros')
        .select('id, num_expediente, nombre_fallecido, tipo_servicio, estado')
        .or(`num_expediente.ilike.${like},nombre_fallecido.ilike.${like}`)
        .limit(4),
      supabase.from('cuotas')
        .select('id, anio, importe, estado, afiliados(nombre, apellidos, num_inscripcion)')
        .eq('estado', 'pendiente')
        .limit(20),
    ])
    const cuotasFiltradas = (cuotas || []).filter(c => {
      if (!c.afiliados) return false
      const texto = `${c.afiliados.nombre || ''} ${c.afiliados.apellidos || ''} ${c.afiliados.num_inscripcion || ''}`.toLowerCase()
      return texto.includes(q.toLowerCase())
    }).slice(0, 4)
    if (errAfs || errSins || errCuotas) {
      console.error('Error en búsqueda:', errAfs || errSins || errCuotas)
    }
    setResults({ afiliados: afs || [], cuotas: cuotasFiltradas, siniestros: sins || [] })
    } catch (err) {
      console.error('Error en búsqueda:', err)
      setResults({ afiliados: [], cuotas: [], siniestros: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults({ afiliados: [], cuotas: [], siniestros: [] }); setOpen(false); return }
    setOpen(true)
    timerRef.current = setTimeout(() => buscar(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, buscar])

  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function ir(path) { navigate(path); setQuery(''); setOpen(false) }

  function badgeTipo(tipo) {
    const map = {
      afiliados:  { label: 'Afiliado',    bg: '#E8F8FC', color: '#1A8FA6' },
      cuotas:     { label: 'Cuota',       bg: '#FAEEDA', color: '#633806' },
      siniestros: { label: 'Expediente',  bg: '#F1F0EC', color: '#5F5E5A' },
    }
    const m = map[tipo] || { label: tipo, bg: '#F1F0EC', color: '#5F5E5A' }
    return <span style={{fontSize:'10px',fontWeight:500,padding:'1px 7px',borderRadius:'20px',background:m.bg,color:m.color,flexShrink:0}}>{m.label}</span>
  }

  const rowStyle = { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 16px',cursor:'pointer',gap:'10px',borderTop:'0.5px solid var(--border)' }
  const sectionLabel = (txt) => <div style={{fontSize:'10px',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--muted)',padding:'10px 16px 4px'}}>{txt}</div>

  return (
    <div ref={wrapRef} style={{position:'relative',width:'100%'}}>
      <div style={{position:'relative'}}>
        <svg style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',width:'14px',height:'14px',color:'var(--muted)',pointerEvents:'none'}} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          style={{width:'100%',paddingLeft:'32px',paddingRight: query ? '32px' : '10px'}}
          placeholder="Buscar afiliados, expedientes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            style={{position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'16px',lineHeight:1,padding:'2px'}}>
            ✕
          </button>
        )}
      </div>

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border-md)',borderRadius:'var(--radius-lg)',boxShadow:'0 8px 30px rgba(0,0,0,0.12)',zIndex:300,overflow:'hidden',maxHeight:'420px',overflowY:'auto'}}>

          {loading && (
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 16px',fontSize:'13px',color:'var(--muted)'}}>
              <div className="spinner"/>Buscando...
            </div>
          )}

          {!loading && total === 0 && (
            <div style={{padding:'14px 16px',fontSize:'13px',color:'var(--muted)'}}>
              Sin resultados para <strong>"{query}"</strong>
            </div>
          )}

          {!loading && results.afiliados.length > 0 && (<>
            {sectionLabel('Afiliados')}
            {results.afiliados.map(a => (
              <div key={a.id} style={rowStyle} onClick={() => ir('/afiliados')}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {highlight(`${a.nombre} ${a.apellidos}`, query)}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--muted)'}}>
                    {highlight(a.num_inscripcion, query)} · {highlight(a.dni_nie, query)} · {a.provincia}
                  </div>
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  {badgeTipo('afiliados')}
                  <span className={`badge badge-${a.estado}`} style={{fontSize:'10px'}}>{a.estado}</span>
                </div>
              </div>
            ))}
          </>)}

          {!loading && results.cuotas.length > 0 && (<>
            {sectionLabel('Cuotas pendientes')}
            {results.cuotas.map(c => (
              <div key={c.id} style={rowStyle} onClick={() => ir('/cuotas')}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:500}}>
                    {highlight(`${c.afiliados?.nombre} ${c.afiliados?.apellidos}`, query)}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--muted)'}}>
                    {highlight(c.afiliados?.num_inscripcion, query)} · Cuota {c.anio} · {Number(c.importe)}€
                  </div>
                </div>
                {badgeTipo('cuotas')}
              </div>
            ))}
          </>)}

          {!loading && results.siniestros.length > 0 && (<>
            {sectionLabel('Expedientes')}
            {results.siniestros.map(s => (
              <div key={s.id} style={rowStyle} onClick={() => ir('/siniestros')}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:500}}>
                    {highlight(s.nombre_fallecido, query)}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--muted)'}}>
                    {highlight(s.num_expediente, query)} · {s.tipo_servicio === 'repatriacion' ? 'Repatriación' : 'Entierro local'}
                  </div>
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  {badgeTipo('siniestros')}
                  <span className={`badge badge-${s.estado}`} style={{fontSize:'10px'}}>{s.estado}</span>
                </div>
              </div>
            ))}
          </>)}

          {!loading && total > 0 && (
            <div style={{padding:'8px 16px',borderTop:'1px solid var(--border)',fontSize:'11px',color:'var(--muted)',textAlign:'center'}}>
              {total} resultado{total !== 1 ? 's' : ''} · Haz clic para ir al módulo
            </div>
          )}
        </div>
      )}
    </div>
  )
}