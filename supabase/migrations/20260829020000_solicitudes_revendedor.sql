-- ZonaHardware - Epica: Identidad y Accesos (HU-003)
-- Un cliente pide pasar a revendedor cargando su CUIT; un administrador
-- aprueba (pasa a rol revendedor) o rechaza (queda como cliente, con motivo).

create table if not exists public.solicitudes_revendedor (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  cuit text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo text,
  revisado_por uuid references public.usuarios(id),
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un usuario no puede tener dos solicitudes pendientes a la vez.
create unique index if not exists solicitudes_revendedor_pendiente_unica
  on public.solicitudes_revendedor (usuario_id)
  where estado = 'pendiente';

drop trigger if exists set_solicitudes_revendedor_updated_at on public.solicitudes_revendedor;
create trigger set_solicitudes_revendedor_updated_at
  before update on public.solicitudes_revendedor
  for each row execute function public.set_updated_at();

create or replace function public.revendedor_role_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.roles where codigo = 'revendedor' limit 1;
$$;

revoke all on function public.revendedor_role_id() from public, anon, authenticated;

-- Alta de la solicitud (HU-003). El propio cliente la crea para si mismo.
create or replace function public.solicitar_alta_revendedor(p_cuit text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para solicitar el alta como revendedor';
  end if;

  if p_cuit is null or length(trim(p_cuit)) = 0 then
    raise exception 'El CUIT es obligatorio';
  end if;

  if exists (
    select 1 from public.solicitudes_revendedor
    where usuario_id = auth.uid() and estado = 'pendiente'
  ) then
    raise exception 'Ya tenes una solicitud pendiente de aprobacion';
  end if;

  update public.usuarios set cuit = p_cuit where id = auth.uid();

  insert into public.solicitudes_revendedor (usuario_id, cuit)
  values (auth.uid(), p_cuit)
  returning id into v_solicitud_id;

  return v_solicitud_id;
end;
$$;

revoke all on function public.solicitar_alta_revendedor(text) from public, anon;
grant execute on function public.solicitar_alta_revendedor(text) to authenticated;

-- Aprobacion: pasa el rol del usuario a revendedor (HU-003). Solo admin.
create or replace function public.aprobar_solicitud_revendedor(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede aprobar solicitudes';
  end if;

  select usuario_id into v_usuario_id
  from public.solicitudes_revendedor
  where id = p_solicitud_id and estado = 'pendiente';

  if v_usuario_id is null then
    raise exception 'La solicitud no existe o ya fue resuelta';
  end if;

  update public.solicitudes_revendedor
  set estado = 'aprobada', revisado_por = auth.uid(), revisado_at = now()
  where id = p_solicitud_id;

  update public.usuarios
  set rol_id = public.revendedor_role_id()
  where id = v_usuario_id;
end;
$$;

revoke all on function public.aprobar_solicitud_revendedor(uuid) from public, anon;
grant execute on function public.aprobar_solicitud_revendedor(uuid) to authenticated;

-- Rechazo: el usuario sigue como cliente, motivo obligatorio (HU-003). Solo admin.
create or replace function public.rechazar_solicitud_revendedor(
  p_solicitud_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede rechazar solicitudes';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo de rechazo es obligatorio';
  end if;

  update public.solicitudes_revendedor
  set estado = 'rechazada',
      motivo_rechazo = p_motivo,
      revisado_por = auth.uid(),
      revisado_at = now()
  where id = p_solicitud_id and estado = 'pendiente';

  if not found then
    raise exception 'La solicitud no existe o ya fue resuelta';
  end if;
end;
$$;

revoke all on function public.rechazar_solicitud_revendedor(uuid, text) from public, anon;
grant execute on function public.rechazar_solicitud_revendedor(uuid, text) to authenticated;

alter table public.solicitudes_revendedor enable row level security;

drop policy if exists "solicitudes_select_propia_o_admin" on public.solicitudes_revendedor;
create policy "solicitudes_select_propia_o_admin"
  on public.solicitudes_revendedor for select
  to authenticated
  using (usuario_id = auth.uid() or public.is_administrador_activo());

-- Toda escritura pasa por las funciones SECURITY DEFINER de arriba.
revoke insert, update, delete on public.solicitudes_revendedor from anon, authenticated;
