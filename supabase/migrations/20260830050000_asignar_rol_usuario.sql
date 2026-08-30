-- ZonaHardware - HU-002: el administrador puede asignar/cambiar el rol de un
-- usuario (tanto al crear un usuario interno como para corregir el rol de uno
-- existente). Reutilizable desde ambos flujos.

create or replace function public.asignar_rol_usuario(
  p_usuario_id uuid,
  p_rol_codigo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol_id uuid;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede asignar roles';
  end if;

  select id into v_rol_id from public.roles where codigo = p_rol_codigo;

  if v_rol_id is null then
    raise exception 'Rol invalido: %', p_rol_codigo;
  end if;

  update public.usuarios set rol_id = v_rol_id where id = p_usuario_id;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke all on function public.asignar_rol_usuario(uuid, text) from public, anon;
grant execute on function public.asignar_rol_usuario(uuid, text) to authenticated;
