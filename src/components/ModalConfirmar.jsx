export default function ModalConfirmar({ config, onConfirmar, onCancelar }) {
  if (!config) return null
  const { titulo, mensaje, labelConfirmar = 'Confirmar', tipo = 'danger' } = config

  const esPeligroso = tipo === 'danger'

  return (
    <div className="modal-overlay" style={{zIndex:400}} onClick={onCancelar}>
      <div className="modal" style={{maxWidth:'420px'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{
              width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
              background: esPeligroso ? 'var(--danger-bg)' : 'var(--warn-bg)'
            }}>
              {esPeligroso
                ? <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--danger-tx)"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                : <svg width="16" height="16" viewBox="0 0 20 20" fill="var(--warn-tx)"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              }
            </div>
            <div className="modal-title">{titulo}</div>
          </div>
          <button className="close-btn" onClick={onCancelar}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.6}}>{mensaje}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancelar}>Cancelar</button>
          <button
            className={esPeligroso ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirmar}
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}