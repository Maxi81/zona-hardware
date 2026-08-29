-- ZonaHardware - Epica 1: Identidad y Accesos

create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text
);

insert into public.roles (codigo, descripcion)
values
  ('cliente', 'Cliente'),
  ('revendedor', 'Revendedor'),
  ('encargado_deposito', 'Encargado de deposito'),
  ('vendedor', 'Vendedor'),
  ('gerente', 'Gerente'),
  ('administrador', 'Administrador')
on conflict (codigo) do update
set descripcion = excluded.descripcion;

create or replace function public.cliente_role_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.roles where codigo = 'cliente' limit 1;
$$;

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  cuit text,
  rol_id uuid not null references public.roles(id),
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usuarios
  alter column rol_id set default public.cliente_role_id();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, apellido, cuit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    new.raw_user_meta_data ->> 'cuit'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_usuarios_updated_at on public.usuarios;
create trigger set_usuarios_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_rol_id uuid,
  p_estado text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.usuarios current_user_profile
    join public.roles current_user_role on current_user_role.id = current_user_profile.rol_id
    where current_user_profile.id = auth.uid()
      and current_user_role.codigo = 'administrador'
      and current_user_profile.estado = 'activo'
  ) then
    raise exception 'Solo un administrador activo puede cambiar accesos';
  end if;

  if p_estado not in ('activo', 'inactivo') then
    raise exception 'Estado de usuario invalido';
  end if;

  update public.usuarios
  set rol_id = p_rol_id, estado = p_estado
  where id = p_user_id;
end;
$$;

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own"
  on public.usuarios for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "usuarios_update_own_identity" on public.usuarios;
create policy "usuarios_update_own_identity"
  on public.usuarios for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Column privileges prevent clients from changing rol_id, estado, or audit fields.
revoke insert, update, delete on public.usuarios from anon, authenticated;
grant select on public.usuarios to authenticated;
grant update (nombre, apellido) on public.usuarios to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.cliente_role_id() from public, anon, authenticated;
revoke all on function public.admin_update_user_access(uuid, uuid, text) from public, anon;
grant execute on function public.admin_update_user_access(uuid, uuid, text) to authenticated;
