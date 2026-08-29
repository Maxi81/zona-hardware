-- ZonaHardware - Epica: Sucursales y Depositos (HU-021, HU-022, HU-023)
-- Requisito del profesor: cada sucursal tiene un unico deposito asociado (1:1).
-- Sirve de base para las transferencias entre depositos (proxima migracion).

create table if not exists public.depositos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_depositos_updated_at on public.depositos;
create trigger set_depositos_updated_at
  before update on public.depositos
  for each row execute function public.set_updated_at();

create table if not exists public.sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  ciudad text,
  provincia text,
  deposito_id uuid not null unique references public.depositos(id),
  estado text not null default 'activa' check (estado in ('activa', 'inactiva')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_sucursales_updated_at on public.sucursales;
create trigger set_sucursales_updated_at
  before update on public.sucursales
  for each row execute function public.set_updated_at();

-- Helper reutilizable para RLS/RPCs que requieren rol administrador activo.
create or replace function public.is_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.roles r on r.id = u.rol_id
    where u.id = auth.uid()
      and r.codigo = 'administrador'
      and u.estado = 'activo'
  );
$$;

revoke all on function public.is_administrador_activo() from public, anon;
grant execute on function public.is_administrador_activo() to authenticated;

-- Alta atomica: crea el deposito y la sucursal juntos (HU-021). Solo administrador.
create or replace function public.crear_sucursal(
  p_nombre text,
  p_direccion text,
  p_ciudad text,
  p_provincia text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposito_id uuid;
  v_sucursal_id uuid;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede crear sucursales';
  end if;

  insert into public.depositos (nombre)
  values ('Deposito ' || p_nombre)
  returning id into v_deposito_id;

  insert into public.sucursales (nombre, direccion, ciudad, provincia, deposito_id)
  values (p_nombre, p_direccion, p_ciudad, p_provincia, v_deposito_id)
  returning id into v_sucursal_id;

  return v_sucursal_id;
end;
$$;

revoke all on function public.crear_sucursal(text, text, text, text) from public, anon;
grant execute on function public.crear_sucursal(text, text, text, text) to authenticated;

-- Baja logica: solo si el deposito no tiene stock (HU-023). La validacion real de
-- stock se agrega cuando exista la tabla stock (proxima migracion); por ahora deja
-- la sucursal en 'inactiva'.
create or replace function public.dar_baja_sucursal(p_sucursal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede dar de baja una sucursal';
  end if;

  update public.sucursales set estado = 'inactiva' where id = p_sucursal_id;
end;
$$;

revoke all on function public.dar_baja_sucursal(uuid) from public, anon;
grant execute on function public.dar_baja_sucursal(uuid) to authenticated;

alter table public.depositos enable row level security;
alter table public.sucursales enable row level security;

-- Lectura: cualquier usuario autenticado (staff interno) puede ver sucursales/depositos.
drop policy if exists "depositos_select_authenticated" on public.depositos;
create policy "depositos_select_authenticated"
  on public.depositos for select
  to authenticated
  using (true);

drop policy if exists "sucursales_select_authenticated" on public.sucursales;
create policy "sucursales_select_authenticated"
  on public.sucursales for select
  to authenticated
  using (true);

-- Escritura: nada por RLS directo; todo pasa por las funciones SECURITY DEFINER
-- de arriba, que validan rol administrador.
revoke insert, update, delete on public.depositos from anon, authenticated;
revoke insert, update, delete on public.sucursales from anon, authenticated;
