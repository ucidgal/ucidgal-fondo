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
