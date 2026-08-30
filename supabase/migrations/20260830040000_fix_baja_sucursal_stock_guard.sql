-- ZonaHardware - Fix HU-023: dar_baja_sucursal debe bloquear la baja si el
-- deposito de la sucursal todavia tiene stock activo (cantidad_disponible o
-- cantidad_reservada > 0 en algun producto). La version original (migracion
-- 20260829010000) se escribio antes de que existiera la tabla stock y dejaba
-- pendiente este guard; ahora que stock existe (desde catalogo_precios), se
-- completa el criterio de aceptacion de HU-023.

create or replace function public.dar_baja_sucursal(p_sucursal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposito_id uuid;
  v_tiene_stock_activo boolean;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador activo puede dar de baja una sucursal';
  end if;

  select deposito_id into v_deposito_id
  from public.sucursales
  where id = p_sucursal_id;

  if v_deposito_id is null then
    raise exception 'La sucursal indicada no existe';
  end if;

  select exists (
    select 1
    from public.stock
    where deposito_id = v_deposito_id
      and (cantidad_disponible > 0 or cantidad_reservada > 0)
  ) into v_tiene_stock_activo;

  if v_tiene_stock_activo then
    raise exception 'No se puede dar de baja la sucursal: su deposito todavia tiene stock activo (disponible o reservado). Retira o transfiere el stock antes de dar de baja.';
  end if;

  update public.sucursales set estado = 'inactiva' where id = p_sucursal_id;
end;
$$;

revoke all on function public.dar_baja_sucursal(uuid) from public, anon;
grant execute on function public.dar_baja_sucursal(uuid) to authenticated;
