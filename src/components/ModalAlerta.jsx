export default function ModalAlerta({ config, onClose }) {
  if (!config) return null
  const { titulo, mensaje, tipo = 'info' } = config

  const estilos = {
    error:   { bg: 'var(--danger-bg)',  color: 'var(--danger-tx)',  icon: '✕', iconBg: '#A32D2D', iconColor: '#fff' },
    warn:    { bg: 'var(--warn-bg)',    color: 'var(--warn-tx)',    icon: '!', iconBg: '#EF9F27', iconColor: '#fff' },
    success: { bg: 'var(--accent-bg)', color: 'var(--accent-dk)',  icon: '✓', iconBg: 'var(--accent)', iconColor: '#fff' },
    info:    { bg: 'var(--info-bg)',    color: 'var(--info-tx)',    icon: 'i', iconBg: 'var(--info-tx)', iconColor: '#fff' },
  }
  const s = estilos[tipo] || estilos.info

  return (
    <div className="modal-overlay" style={{zIndex:500}} onClick={onClose}>
      <div className="modal" style={{maxWidth:'400px'}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,
              background:s.iconBg,color:s.iconColor,
              display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:'14px'}}>
              {s.icon}
            </div>
            <div className="modal-title">{titulo}</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.6}}>{mensaje}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  )
}
