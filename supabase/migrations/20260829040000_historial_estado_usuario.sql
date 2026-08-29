-- ZonaHardware - Epica: Identidad y Accesos (HU-006)
-- Desactivar/reactivar una cuenta dejando registrado el motivo, quien lo
-- hizo y cuando, sin perder el historial de pedidos/movimientos del usuario
-- (que no se toca: solo cambia usuarios.estado).

create table if not exists public.usuarios_historial_estado (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id),
  estado_anterior text not null,
  estado_nuevo text not null,
  motivo text not null,
  cambiado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.usuarios_historial_estado enable row level security;

drop policy if exists "historial_estado_solo_admin" on public.usuarios_historial_estado;
create policy "historial_estado_solo_admin"
  on public.usuarios_historial_estado for select
  to authenticated
  using (public.is_administrador_activo());

-- Tabla de solo lectura por API: toda escritura pasa por la funcion de abajo.
revoke insert, update, delete on public.usuarios_historial_estado from anon, authenticated;

create or replace function public.cambiar_estado_usuario(
  p_user_id uuid,
  p_nuevo_estado text,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual text;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede cambiar el estado de una cuenta';
  end if;

  if p_nuevo_estado not in ('activo', 'inactivo') then
    raise exception 'Estado de usuario invalido';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo es obligatorio';
  end if;

  select estado into v_estado_actual from public.usuarios where id = p_user_id;

  if v_estado_actual is null then
    raise exception 'El usuario no existe';
  end if;

  if v_estado_actual = p_nuevo_estado then
    raise exception 'La cuenta ya está en ese estado';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No podés cambiar el estado de tu propia cuenta';
  end if;

  update public.usuarios set estado = p_nuevo_estado where id = p_user_id;

  insert into public.usuarios_historial_estado
    (usuario_id, estado_anterior, estado_nuevo, motivo, cambiado_por)
  values
    (p_user_id, v_estado_actual, p_nuevo_estado, p_motivo, auth.uid());
end;
$$;

revoke all on function public.cambiar_estado_usuario(uuid, text, text) from public, anon;
grant execute on function public.cambiar_estado_usuario(uuid, text, text) to authenticated;
