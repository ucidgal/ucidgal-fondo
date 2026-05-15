import { useState } from 'react'

export default function ModalEliminar({ config, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError]   = useState('')

  if (!config) return null

  function handleConfirmar() {
    if (!motivo.trim()) { setError('El motivo es obligatorio para eliminar un registro.'); return }
    if (motivo.trim().length < 10) { setError('Por favor describe el motivo con más detalle (mínimo 10 caracteres).'); return }
    onConfirmar(motivo.trim())
    setMotivo('')
    setError('')
  }

  function handleCancelar() {
    setMotivo('')
    setError('')
    onCancelar()
  }

  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={handleCancelar}>
      <div className="modal" style={{maxWidth:'440px'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--danger-bg)'}}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--danger-tx)">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="modal-title">Eliminar {config.tipo}</div>
          </div>
          <button className="close-btn" onClick={handleCancelar}>✕</button>
        </div>
        <div className="modal-body">
          <div className="alert alert-error" style={{marginBottom:'1rem'}}>
            <strong>Esta acción es irreversible.</strong> El registro se eliminará permanentemente de la base de datos.
          </div>
          <div style={{background:'var(--bg)',borderRadius:'var(--radius-sm)',padding:'10px 14px',marginBottom:'1rem',fontSize:'13px'}}>
            <div style={{color:'var(--muted)',fontSize:'11px',marginBottom:'4px',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em'}}>{config.tipo} a eliminar</div>
            <div style={{fontWeight:500,color:'var(--text)'}}>{config.nombre}</div>
            {config.detalle && <div style={{color:'var(--muted)',fontSize:'12px',marginTop:'2px'}}>{config.detalle}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Motivo de eliminación <span style={{color:'var(--danger-tx)'}}>*</span></label>
            <textarea
              className="form-textarea"
              value={motivo}
              onChange={e => { setMotivo(e.target.value); setError('') }}
              placeholder="Ej: Registro duplicado, datos incorrectos al dar de alta..."
              rows={3}
              autoFocus
            />
            {error && <span style={{fontSize:'12px',color:'var(--danger-tx)',marginTop:'4px'}}>{error}</span>}
          </div>
          <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'0.75rem'}}>
            El motivo quedará registrado en el historial de auditoría junto con el email del administrador y la fecha.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={handleCancelar}>Cancelar</button>
          <button
            className="btn btn-danger"
            style={{background:'#A32D2D',color:'#fff',borderColor:'#A32D2D'}}
            onClick={handleConfirmar}
          >
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}
