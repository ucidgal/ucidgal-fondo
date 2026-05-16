export default function Reglamento() {
  const articulos = [
    {
      num: 1,
      titulo: 'Titularidad',
      texto: 'El citado fondo es propiedad de la Unión de Comunidades Musulmanas de Galicia (UCIDGAL). La inscripción está abierta a todos los musulmanes residentes en la comunidad autónoma de Galicia.'
    },
    {
      num: 2,
      titulo: 'Cobertura',
      texto: 'El fondo cubrirá los gastos de traslado del féretro o el entierro en un cementerio islámico dentro del territorio español.'
    },
    {
      num: 3,
      titulo: 'Supervisión',
      texto: 'Un comité especial de UCIDGAL será el responsable de supervisar el fondo y examinar las solicitudes de afiliación.'
    },
    {
      num: 4,
      titulo: 'Modificaciones',
      texto: 'Cualquier cambio, modificación o adición a los artículos de la ley fundamental del fondo deberá ser presentado y aprobado por UCIDGAL.'
    },
    {
      num: 5,
      titulo: 'Cuotas familiares',
      texto: 'La cuota de inscripción es de 50 € anuales por unidad familiar (matrimonio e hijos menores de edad). El afiliado deberá abonar 25 € adicionales por cada progenitor que conviva en el mismo domicilio.'
    },
    {
      num: 6,
      titulo: 'Cuotas individuales',
      texto: 'Los mayores de 18 años, ya sean solteros que residan con sus padres o independientes, abonarán una cuota de 25 €.'
    },
    {
      num: 7,
      titulo: 'Plazo de renovación',
      texto: 'El periodo de renovación se inicia el 1 de enero y finaliza el último día de febrero de cada año.'
    },
    {
      num: 8,
      titulo: 'Impago',
      texto: 'Transcurrido el periodo de suscripción sin que el miembro haya abonado la cuota anual, éste perderá automáticamente el derecho a los servicios del fondo.'
    },
    {
      num: 9,
      titulo: 'Acreditación',
      texto: 'A cada miembro del fondo se le facilitará una tarjeta de afiliación en formato virtual para su uso en dispositivos móviles.'
    },
    {
      num: 10,
      titulo: 'Coste de emisión',
      texto: 'La tarjeta virtual es totalmente gratuita. No se aplicará ningún cargo por su emisión inicial ni por reenvíos en caso de actualización de datos o cambio de dispositivo.'
    },
    {
      num: 11,
      titulo: 'Periodo de carencia y condiciones especiales',
      texto: 'Los nuevos afiliados tendrán derecho a los beneficios del fondo transcurridos 90 días desde la fecha de su alta y pago de la cuota. Como excepción, en caso de que el afiliado padezca una enfermedad terminal, durante los primeros 180 días solo tendrá derecho al 50 % de la cobertura de los gastos de sepelio o repatriación. Transcurrido un año completo desde la fecha de afiliación, dicho miembro tendrá derecho al 100 % de los beneficios.',
    },
    {
      num: 12,
      titulo: 'No devolución',
      texto: 'Ningún afiliado tendrá derecho a exigir la devolución de las cuotas o aportaciones realizadas anteriormente bajo ningún concepto.'
    },
    {
      num: 13,
      titulo: 'Gestión bancaria',
      texto: 'El fondo dispone de una cuenta bancaria específica para su administración y transparencia.'
    },
    {
      num: 14,
      titulo: 'Fallecimiento de menores',
      texto: 'Los recién nacidos fallecidos serán enterrados en cementerios islámicos en España. Quedan excluidos de este servicio los casos de aborto.'
    },
    {
      num: 15,
      titulo: 'Matrimonios mixtos',
      texto: 'En caso de matrimonio mixto, el cónyuge deberá aportar, en el momento de la inscripción, un acta notarial que exprese su voluntad respecto al lugar de su sepultura.'
    },
    {
      num: 16,
      titulo: 'Aceptación de términos y validación digital',
      texto: 'Al cumplimentar el formulario de inscripción o renovación web y marcar obligatoriamente la casilla de aceptación, el miembro declara su total conformidad y acuerdo con todo el contenido del presente reglamento. Dicha acción web, junto con el posterior envío de la tarjeta de afiliación virtual, constituirá la validación formal y el consentimiento explícito del contrato entre ambas partes.'
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Reglamento del Fondo</div>
        <div className="page-subtitle">Fondo para el Entierro y Repatriación de Musulmanes Fallecidos en Galicia · UCIDGAL</div>
      </div>

<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {articulos.map(art => (
          <div key={art.num} className="card">
            <div className="card-body" style={{padding:'1.25rem 1.5rem',display:'flex',gap:'1.25rem',alignItems:'flex-start'}}>
              <div style={{
                width:'36px',height:'36px',borderRadius:'50%',flexShrink:0,
                background:'var(--accent-bg)',color:'var(--accent-dk)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'13px',fontWeight:600
              }}>
                {art.num}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'14px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>
                  Art. {art.num} · {art.titulo}

                </div>
                <div style={{fontSize:'13px',color:'var(--muted)',lineHeight:1.7}}>
                  {art.texto}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>



      <div style={{marginTop:'1rem',padding:'10px 1.25rem',fontSize:'11px',color:'var(--muted)',textAlign:'center'}}>
        Reglamento oficial del Fondo para el Entierro y Repatriación de Musulmanes Fallecidos en Galicia · UCIDGAL
      </div>
    </div>
  )
}
