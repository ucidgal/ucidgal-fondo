-- ============================================================
-- UCIDGAL · Fondo Islámico de Repatriación
-- Schema para Supabase — ejecutar en SQL Editor
-- ============================================================

-- Afiliados
create table afiliados (
  id            uuid primary key default gen_random_uuid(),
  num_inscripcion text unique not null,
  nombre        text not null,
  apellidos     text not null,
  dni_nie       text not null,
  fecha_nacimiento date,
  pais_origen   text,
  estado_civil  text,
  direccion     text,
  provincia     text,
  telefono      text,
  email         text,
  tipo_inscripcion text default 'familia', -- 'familia' | 'individual'
  num_miembros  int default 1,
  padres_convivientes int default 0,
  estado        text default 'pendiente', -- 'activo' | 'pendiente' | 'baja'
  matrimonio_mixto boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Cuotas
create table cuotas (
  id            uuid primary key default gen_random_uuid(),
  afiliado_id   uuid references afiliados(id) on delete cascade,
  anio          int not null,
  importe       numeric(8,2) not null,
  fecha_pago    date,
  referencia    text,
  estado        text default 'pendiente', -- 'pagado' | 'pendiente' | 'impagado'
  created_at    timestamptz default now()
);

-- Siniestros (fallecidos)
create table siniestros (
  id            uuid primary key default gen_random_uuid(),
  num_expediente text unique not null,
  afiliado_id   uuid references afiliados(id),
  nombre_fallecido text not null,
  fecha_fallecimiento date,
  lugar_fallecimiento text,
  tipo_servicio text not null, -- 'repatriacion' | 'entierro_local'
  pais_destino  text,
  cert_defuncion text default 'pendiente', -- 'pendiente' | 'recibido'
  permiso_traslado text default 'pendiente', -- 'pendiente' | 'obtenido'
  observaciones text,
  estado        text default 'abierto', -- 'abierto' | 'procesando' | 'cerrado'
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Row Level Security (solo admins autenticados)
alter table afiliados enable row level security;
alter table cuotas enable row level security;
alter table siniestros enable row level security;

create policy "Admin full access afiliados"
  on afiliados for all using (auth.role() = 'authenticated');

create policy "Admin full access cuotas"
  on cuotas for all using (auth.role() = 'authenticated');

create policy "Admin full access siniestros"
  on siniestros for all using (auth.role() = 'authenticated');

-- Función para calcular cuota anual
create or replace function calcular_cuota(tipo text, miembros int, padres int)
returns numeric as $$
begin
  if tipo = 'individual' then
    return 25.00 + (padres * 25.00);
  else
    return 50.00 + (padres * 25.00);
  end if;
end;
$$ language plpgsql;

-- ============================================================
-- ACTUALIZACIÓN v2 — ejecutar si ya tienes la tabla siniestros
-- ============================================================
alter table siniestros add column if not exists tipo_fallecido text default 'adulto';
-- Valores posibles: 'adulto' | 'menor_un_anio' | 'aborto'

-- ============================================================
-- ACTUALIZACIÓN v3 — Historial de cambios de afiliados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create table if not exists historial_afiliados (
  id            uuid primary key default gen_random_uuid(),
  afiliado_id   uuid references afiliados(id) on delete cascade,
  usuario_email text not null,
  accion        text not null,  -- 'creacion' | 'edicion' | 'cambio_estado' | 'baja'
  campo         text,           -- campo modificado (null si es creación)
  valor_anterior text,
  valor_nuevo    text,
  created_at    timestamptz default now()
);

alter table historial_afiliados enable row level security;

create policy "Admin full access historial"
  on historial_afiliados for all using (auth.role() = 'authenticated');

create index if not exists idx_historial_afiliado on historial_afiliados(afiliado_id, created_at desc);

-- ============================================================
-- ACTUALIZACIÓN v4 — Auditoría de eliminaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================
create table if not exists auditoria_eliminaciones (
  id            uuid primary key default gen_random_uuid(),
  tabla         text not null,
  registro_id   uuid not null,
  datos_previos jsonb,
  motivo        text not null,
  usuario_email text not null,
  created_at    timestamptz default now()
);
alter table auditoria_eliminaciones enable row level security;
create policy "Admin full access auditoria"
  on auditoria_eliminaciones for all using (auth.role() = 'authenticated');

-- ============================================================
-- ACTUALIZACIÓN v5 — DNI/NIE único por afiliado
-- Ejecutar en Supabase SQL Editor
-- ============================================================
alter table afiliados add constraint afiliados_dni_nie_unique unique (dni_nie);

-- ============================================================
-- ACTUALIZACIÓN v6 — Hijos menores en afiliados
-- Ejecutar en Supabase SQL Editor
-- ============================================================
alter table afiliados add column if not exists hijos jsonb default '[]'::jsonb;
-- Formato: [{"nombre": "Ahmed", "fecha_nacimiento": "2015-03-10"}, ...]

-- ============================================================
-- ACTUALIZACIÓN v7 — Datos del segundo cónyuge
-- Ejecutar en Supabase SQL Editor
-- ============================================================
alter table afiliados add column if not exists conyuge jsonb default null;
-- Formato: {"nombre": "", "apellidos": "", "dni_nie": "", "fecha_nacimiento": ""}

-- ============================================================
-- ACTUALIZACIÓN v8 — Almacenamiento de documentos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear bucket de almacenamiento (ejecutar en Storage o con esta función)
insert into storage.buckets (id, name, public)
values ('documentos-afiliados', 'documentos-afiliados', false)
on conflict (id) do nothing;

-- 2. Políticas de acceso al bucket
create policy "Admin puede subir documentos"
  on storage.objects for insert
  with check (bucket_id = 'documentos-afiliados' and auth.role() = 'authenticated');

create policy "Admin puede ver documentos"
  on storage.objects for select
  using (bucket_id = 'documentos-afiliados' and auth.role() = 'authenticated');

create policy "Admin puede eliminar documentos"
  on storage.objects for delete
  using (bucket_id = 'documentos-afiliados' and auth.role() = 'authenticated');

-- ============================================================
-- ACTUALIZACIÓN v9 — Estados mejorados de afiliados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Nuevos valores posibles para estado:
-- 'pendiente_pago'   → recién inscrito, sin cuota pagada
-- 'en_carencia'      → cuota pagada, dentro de los 90 días
-- 'activo'           → cuota pagada, cobertura vigente
-- 'impagado'         → pasó el plazo sin pagar
-- 'baja_voluntaria'  → baja por decisión propia
-- 'baja_impago'      → baja automática por impago

-- Vista que calcula el estado real de cada afiliado
create or replace view afiliados_estado_real as
select
  a.*,
  c.fecha_pago as ultima_fecha_pago,
  case
    when a.estado in ('baja_voluntaria','baja_impago','baja') then a.estado
    when c.fecha_pago is null then 'pendiente_pago'
    when now() < (c.fecha_pago::date + interval '90 days') then 'en_carencia'
    when now() >= (c.fecha_pago::date + interval '90 days')
      and now() < (c.fecha_pago::date + interval '90 days' + interval '1 year') then 'activo'
    else 'impagado'
  end as estado_calculado
from afiliados a
left join lateral (
  select fecha_pago
  from cuotas
  where afiliado_id = a.id
    and estado = 'pagado'
  order by fecha_pago desc
  limit 1
) c on true;

-- Política RLS para la vista
grant select on afiliados_estado_real to authenticated;
