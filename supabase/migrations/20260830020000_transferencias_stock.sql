-- ZonaHardware - Epica: Transferencias entre Depositos (HU-031, HU-032, HU-033)
-- Requisito 2 del profesor (obligatorio): si una sucursal se queda sin
-- stock, primero consulta su propio deposito; si tampoco tiene, solicita
-- transferencia a OTRO deposito de la red, con aprobacion manual del
-- encargado del deposito origen (o un Gerente).
--
-- HU-031: solicitar transferencia (ver disponibilidad en la red, crear la
--         solicitud, reservar stock en el deposito origen).
-- HU-032: aprobar o rechazar la solicitud (encargado del deposito origen).
-- HU-033: despachar (Transferencia Salida) y confirmar recepcion
--         (Transferencia Entrada), reutilizando registrar_movimiento_stock().
--
-- Nota de alcance: HU-034 (marcar automaticamente "Con Diferencias" cuando
-- lo recibido no coincide con lo despachado) y HU-035 (historial de red con
-- filtros y exportacion) quedan para una proxima iteracion. Por ahora,
-- confirmar_recepcion_transferencia() exige que la cantidad recibida
-- coincida exactamente con la despachada; si no coincide, rechaza la
-- confirmacion con un mensaje claro en vez de intentar resolver la
-- diferencia (eso es exactamente lo que va a hacer HU-034).
--
-- Nota de alcance (RBAC): el backlog dice "Encargado de Deposito (origen) /
-- Gerente" para aprobar. Este proyecto no tiene todavia ninguna pantalla
-- para dar de alta un usuario con rol 'gerente' ni para asignarle un
-- deposito especifico a un encargado (ver hueco HU-002, memoria del
-- proyecto) -- el rol encargado_deposito es global, igual que en HU-025/026
-- (el encargado ya puede operar cualquier deposito de la red desde
-- /deposito, no solo "el suyo"). Se mantiene la misma convencion aca: se
-- gatea a is_administrador_activo() OR is_encargado_deposito_activo(), sin
-- restriccion por deposito especifico ni canal separado para gerente.

create table if not exists public.transferencias_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  deposito_origen_id uuid not null references public.depositos(id),
  deposito_destino_id uuid not null references public.depositos(id),
  cantidad integer not null check (cantidad > 0),
  cantidad_recibida integer,
  estado text not null default 'pendiente_aprobacion'
    check (estado in ('pendiente_aprobacion', 'aprobada', 'rechazada', 'en_transito', 'completada')),
  solicitado_por uuid references public.usuarios(id),
  resuelto_por uuid references public.usuarios(id),
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deposito_origen_id <> deposito_destino_id)
);

create index if not exists transferencias_stock_origen_estado_idx
  on public.transferencias_stock (deposito_origen_id, estado);
create index if not exists transferencias_stock_destino_estado_idx
  on public.transferencias_stock (deposito_destino_id, estado);

drop trigger if exists set_transferencias_stock_updated_at on public.transferencias_stock;
create trigger set_transferencias_stock_updated_at
  before update on public.transferencias_stock
  for each row execute function public.set_updated_at();

-- HU-031 criterio 1 y 3: que otros depositos de la red tienen stock
-- disponible (no reservado) de un producto, excluyendo el propio.
create or replace function public.stock_disponible_en_red(
  p_producto_id uuid,
  p_excluir_deposito_id uuid
)
returns table (deposito_id uuid, deposito_nombre text, cantidad_disponible integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para consultar stock de la red';
  end if;

  return query
    select d.id, d.nombre, (s.cantidad_disponible - s.cantidad_reservada)
    from public.stock s
    join public.depositos d on d.id = s.deposito_id
    where s.producto_id = p_producto_id
      and s.deposito_id <> p_excluir_deposito_id
      and (s.cantidad_disponible - s.cantidad_reservada) > 0
    order by (s.cantidad_disponible - s.cantidad_reservada) desc;
end;
$$;

revoke all on function public.stock_disponible_en_red(uuid, uuid) from public, anon;
grant execute on function public.stock_disponible_en_red(uuid, uuid) to authenticated;

-- HU-031 criterio 2: crea la solicitud y reserva stock en el deposito
-- origen (el que tiene el stock fisico) hasta que se resuelva.
create or replace function public.solicitar_transferencia(
  p_producto_id uuid,
  p_deposito_origen_id uuid,
  p_deposito_destino_id uuid,
  p_cantidad integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disponible integer;
  v_transferencia_id uuid;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para solicitar transferencias de stock';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a 0';
  end if;

  if p_deposito_origen_id = p_deposito_destino_id then
    raise exception 'El deposito de origen y el de destino no pueden ser el mismo';
  end if;

  select (cantidad_disponible - cantidad_reservada) into v_disponible
  from public.stock
  where producto_id = p_producto_id and deposito_id = p_deposito_origen_id
  for update;

  if v_disponible is null or v_disponible < p_cantidad then
    raise exception 'No hay stock suficiente disponible en el deposito de origen para transferir';
  end if;

  update public.stock
  set cantidad_reservada = cantidad_reservada + p_cantidad
  where producto_id = p_producto_id and deposito_id = p_deposito_origen_id;

  insert into public.transferencias_stock (
    producto_id, deposito_origen_id, deposito_destino_id, cantidad, solicitado_por
  )
  values (
    p_producto_id, p_deposito_origen_id, p_deposito_destino_id, p_cantidad, auth.uid()
  )
  returning id into v_transferencia_id;

  return v_transferencia_id;
end;
$$;

revoke all on function public.solicitar_transferencia(uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.solicitar_transferencia(uuid, uuid, uuid, integer) to authenticated;

-- HU-032: aprobar o rechazar. Rechazar libera la reserva de inmediato
-- (criterio 2).
create or replace function public.resolver_transferencia(
  p_transferencia_id uuid,
  p_aprobar boolean,
  p_motivo_rechazo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transferencia public.transferencias_stock;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para aprobar o rechazar transferencias de stock';
  end if;

  select * into v_transferencia
  from public.transferencias_stock
  where id = p_transferencia_id
  for update;

  if v_transferencia.id is null then
    raise exception 'Transferencia no encontrada';
  end if;

  if v_transferencia.estado <> 'pendiente_aprobacion' then
    raise exception 'Esta transferencia ya fue resuelta';
  end if;

  if p_aprobar then
    update public.transferencias_stock
    set estado = 'aprobada', resuelto_por = auth.uid()
    where id = p_transferencia_id;
  else
    if p_motivo_rechazo is null or btrim(p_motivo_rechazo) = '' then
      raise exception 'El motivo del rechazo es obligatorio';
    end if;

    update public.stock
    set cantidad_reservada = cantidad_reservada - v_transferencia.cantidad
    where producto_id = v_transferencia.producto_id
      and deposito_id = v_transferencia.deposito_origen_id;

    update public.transferencias_stock
    set estado = 'rechazada', resuelto_por = auth.uid(), motivo_rechazo = p_motivo_rechazo
    where id = p_transferencia_id;
  end if;
end;
$$;

revoke all on function public.resolver_transferencia(uuid, boolean, text) from public, anon;
grant execute on function public.resolver_transferencia(uuid, boolean, text) to authenticated;

-- HU-033 parte 1: despachar una transferencia aprobada. Genera el
-- movimiento Transferencia Salida (reutiliza registrar_movimiento_stock,
-- que ya descuenta cantidad_disponible) y libera la reserva, porque el
-- stock ya salio fisicamente del deposito (deja de estar "reservado" para
-- pasar a estar simplemente afuera).
create or replace function public.despachar_transferencia(p_transferencia_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transferencia public.transferencias_stock;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para despachar transferencias de stock';
  end if;

  select * into v_transferencia
  from public.transferencias_stock
  where id = p_transferencia_id
  for update;

  if v_transferencia.id is null then
    raise exception 'Transferencia no encontrada';
  end if;

  if v_transferencia.estado <> 'aprobada' then
    raise exception 'Solo se puede despachar una transferencia aprobada';
  end if;

  perform public.registrar_movimiento_stock(
    v_transferencia.producto_id,
    v_transferencia.deposito_origen_id,
    'TRANSFERENCIA_SALIDA',
    v_transferencia.cantidad,
    'Despacho de transferencia',
    'transferencia',
    v_transferencia.id
  );

  update public.stock
  set cantidad_reservada = cantidad_reservada - v_transferencia.cantidad
  where producto_id = v_transferencia.producto_id
    and deposito_id = v_transferencia.deposito_origen_id;

  update public.transferencias_stock
  set estado = 'en_transito'
  where id = p_transferencia_id;
end;
$$;

revoke all on function public.despachar_transferencia(uuid) from public, anon;
grant execute on function public.despachar_transferencia(uuid) to authenticated;

-- HU-033 parte 2: confirmar recepcion. Si la cantidad recibida no coincide
-- con la despachada, se rechaza la confirmacion con un mensaje claro en vez
-- de intentar resolverlo -- eso es HU-034 (Con Diferencias), que queda para
-- una proxima iteracion.
create or replace function public.confirmar_recepcion_transferencia(
  p_transferencia_id uuid,
  p_cantidad_recibida integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transferencia public.transferencias_stock;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para confirmar la recepcion de transferencias de stock';
  end if;

  select * into v_transferencia
  from public.transferencias_stock
  where id = p_transferencia_id
  for update;

  if v_transferencia.id is null then
    raise exception 'Transferencia no encontrada';
  end if;

  if v_transferencia.estado <> 'en_transito' then
    raise exception 'Solo se puede confirmar la recepcion de una transferencia en transito';
  end if;

  if p_cantidad_recibida is null or p_cantidad_recibida <= 0 then
    raise exception 'La cantidad recibida tiene que ser mayor a 0';
  end if;

  if p_cantidad_recibida <> v_transferencia.cantidad then
    raise exception 'La cantidad recibida (%) no coincide con la despachada (%). El manejo de diferencias todavia no esta implementado (queda para una proxima historia).',
      p_cantidad_recibida, v_transferencia.cantidad;
  end if;

  perform public.registrar_movimiento_stock(
    v_transferencia.producto_id,
    v_transferencia.deposito_destino_id,
    'TRANSFERENCIA_ENTRADA',
    v_transferencia.cantidad,
    'Recepcion de transferencia',
    'transferencia',
    v_transferencia.id
  );

  update public.transferencias_stock
  set estado = 'completada', cantidad_recibida = p_cantidad_recibida
  where id = p_transferencia_id;
end;
$$;

revoke all on function public.confirmar_recepcion_transferencia(uuid, integer) from public, anon;
grant execute on function public.confirmar_recepcion_transferencia(uuid, integer) to authenticated;

alter table public.transferencias_stock enable row level security;

drop policy if exists "transferencias_stock_select_admin_o_encargado" on public.transferencias_stock;
create policy "transferencias_stock_select_admin_o_encargado"
  on public.transferencias_stock for select to authenticated
  using (public.is_administrador_activo() or public.is_encargado_deposito_activo());

revoke insert, update, delete on public.transferencias_stock from anon, authenticated;
