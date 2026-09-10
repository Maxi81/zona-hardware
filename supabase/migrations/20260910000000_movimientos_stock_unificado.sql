-- Movimientos de Stock unificado (10/09/2026).
--
-- Pedido del usuario: unificar Stock y Transferencias en una sola pantalla
-- "Movimientos de Stock", con un historial global (ingresos, egresos,
-- transferencias) y un unico modal para cargar cualquiera. El profesor dio
-- el visto bueno para que, mientras no se trabaje con roles en serio en
-- estos sprints, las transferencias entre depositos NO requieran aprobacion
-- manual: se resuelven al instante, en un solo paso, igual que un ingreso.
--
-- Esto NO borra el flujo viejo de aprobacion (solicitar/resolver/despachar/
-- confirmar_recepcion_transferencia siguen existiendo en la base, sin uso)
-- por las dudas de tener que volver atras, pero la app deja de llamarlos.

-- 1) Campos nuevos para un ingreso por compra a proveedor (texto libre por
--    ahora; el usuario ya avisó que más adelante puede pasar a una tabla de
--    proveedores propia, así que se dejan como columnas simples y
--    migrables el día de mañana sin tocar el resto).
alter table public.movimientos_stock
  add column if not exists proveedor text,
  add column if not exists orden_compra text;

-- 2) Tipos de movimiento nuevos: el "AJUSTE" que había quedado como
--    placeholder (HU-027) ahora se necesita en los dos sentidos (sumar o
--    restar), y hace falta un egreso genérico sin motivo formal (todavía no
--    hay ventas). Se agregan tipos nuevos en vez de tocar los que ya existen
--    (INGRESO, EGRESO_VENTA, TRANSFERENCIA_SALIDA/ENTRADA, AJUSTE) para no
--    romper nada que ya esté guardado con esos códigos.
insert into public.tipo_movimiento_stock (codigo, signo, descripcion) values
  ('AJUSTE_POSITIVO', 1, 'Ajuste manual que suma stock (ej. conteo fisico encontro mas)'),
  ('AJUSTE_NEGATIVO', -1, 'Ajuste manual que resta stock (ej. rotura, perdida, error de carga)'),
  ('EGRESO_OTRO', -1, 'Egreso manual sin transferencia ni ajuste (motivo libre)')
on conflict (codigo) do nothing;

-- 3) registrar_movimiento_stock() suma proveedor/orden_compra al final
--    (parametros nuevos, con default null) - hace falta un drop porque
--    Postgres trata una lista de parametros distinta como una funcion
--    distinta, no un "or replace" de la que ya existia.
drop function if exists public.registrar_movimiento_stock(uuid, uuid, text, integer, text, text, uuid);

create function public.registrar_movimiento_stock(
  p_producto_id uuid,
  p_deposito_id uuid,
  p_tipo_codigo text,
  p_cantidad integer,
  p_motivo text default null,
  p_referencia_tipo text default null,
  p_referencia_id uuid default null,
  p_proveedor text default null,
  p_orden_compra text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_id uuid;
  v_signo smallint;
  v_movimiento_id uuid;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para registrar movimientos de stock';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a 0';
  end if;

  select id, signo into v_tipo_id, v_signo
  from public.tipo_movimiento_stock
  where codigo = p_tipo_codigo;

  if v_tipo_id is null then
    raise exception 'Tipo de movimiento invalido: %', p_tipo_codigo;
  end if;

  insert into public.stock (producto_id, deposito_id)
  values (p_producto_id, p_deposito_id)
  on conflict (producto_id, deposito_id) do nothing;

  begin
    update public.stock
    set cantidad_disponible = cantidad_disponible + (p_cantidad * v_signo)
    where producto_id = p_producto_id and deposito_id = p_deposito_id;
  exception
    when check_violation then
      raise exception 'Stock insuficiente en ese deposito para este movimiento';
  end;

  insert into public.movimientos_stock (
    producto_id, deposito_id, tipo_movimiento_id, cantidad,
    referencia_tipo, referencia_id, usuario_id, motivo, proveedor, orden_compra
  )
  values (
    p_producto_id, p_deposito_id, v_tipo_id, p_cantidad,
    p_referencia_tipo, p_referencia_id, auth.uid(), p_motivo, p_proveedor, p_orden_compra
  )
  returning id into v_movimiento_id;

  return v_movimiento_id;
end;
$$;

revoke all on function public.registrar_movimiento_stock(uuid, uuid, text, integer, text, text, uuid, text, text) from public, anon;
grant execute on function public.registrar_movimiento_stock(uuid, uuid, text, integer, text, text, uuid, text, text) to authenticated;

-- 4) Transferencia directa, sin aprobacion (visto bueno del profesor,
--    10/09/2026): un solo paso genera los dos movimientos (salida en
--    origen, entrada en destino) y deja la transferencia ya "completada"
--    desde el arranque, reutilizando registrar_movimiento_stock() para no
--    duplicar la logica de stock/movimientos. Si el origen no tiene stock
--    suficiente, el primer registrar_movimiento_stock() de abajo revienta
--    con el mismo check_violation de siempre y no se aplica nada (estamos
--    dentro de la misma transaccion: el insert de la transferencia y el
--    segundo movimiento tambien se revierten).
create or replace function public.registrar_transferencia_directa(
  p_producto_id uuid,
  p_deposito_origen_id uuid,
  p_deposito_destino_id uuid,
  p_cantidad integer,
  p_motivo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transferencia_id uuid;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para registrar transferencias de stock';
  end if;

  if p_deposito_origen_id = p_deposito_destino_id then
    raise exception 'El deposito de origen y el de destino no pueden ser el mismo';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad tiene que ser mayor a 0';
  end if;

  insert into public.transferencias_stock (
    producto_id, deposito_origen_id, deposito_destino_id, cantidad,
    cantidad_recibida, estado, solicitado_por
  )
  values (
    p_producto_id, p_deposito_origen_id, p_deposito_destino_id, p_cantidad,
    p_cantidad, 'completada', auth.uid()
  )
  returning id into v_transferencia_id;

  perform public.registrar_movimiento_stock(
    p_producto_id, p_deposito_origen_id, 'TRANSFERENCIA_SALIDA', p_cantidad,
    p_motivo, 'transferencia', v_transferencia_id
  );

  perform public.registrar_movimiento_stock(
    p_producto_id, p_deposito_destino_id, 'TRANSFERENCIA_ENTRADA', p_cantidad,
    p_motivo, 'transferencia', v_transferencia_id
  );

  return v_transferencia_id;
end;
$$;

revoke all on function public.registrar_transferencia_directa(uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.registrar_transferencia_directa(uuid, uuid, uuid, integer, text) to authenticated;

-- 5) Historial unificado: una sola funcion que devuelve movimientos_stock
--    ya "aplanados" (nombre de deposito/producto, tipo con su signo,
--    contraparte de deposito cuando es una transferencia, usuario que lo
--    cargo), con filtros opcionales. Evita tener que resolver en el cliente
--    los embeds ambiguos de depositos (transferencias_stock tiene 2 FKs a
--    depositos) - ver nota de RLS/embeds del proyecto.
create or replace function public.listar_movimientos_stock(
  p_deposito_id uuid default null,
  p_producto_id uuid default null,
  p_tipo_codigo text default null,
  p_desde date default null,
  p_hasta date default null,
  p_limite integer default 100
)
returns table (
  id uuid,
  created_at timestamptz,
  deposito_id uuid,
  deposito_nombre text,
  producto_id uuid,
  producto_sku text,
  producto_nombre text,
  tipo_codigo text,
  tipo_signo smallint,
  tipo_descripcion text,
  cantidad integer,
  motivo text,
  proveedor text,
  orden_compra text,
  referencia_tipo text,
  transferencia_id uuid,
  contraparte_deposito_id uuid,
  contraparte_deposito_nombre text,
  usuario_nombre text,
  usuario_apellido text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_personal_interno_activo() then
    raise exception 'No tenes permiso para ver los movimientos de stock';
  end if;

  return query
    select
      m.id,
      m.created_at,
      m.deposito_id,
      d.nombre as deposito_nombre,
      m.producto_id,
      p.sku as producto_sku,
      p.nombre as producto_nombre,
      tm.codigo as tipo_codigo,
      tm.signo as tipo_signo,
      tm.descripcion as tipo_descripcion,
      m.cantidad,
      m.motivo,
      m.proveedor,
      m.orden_compra,
      m.referencia_tipo,
      t.id as transferencia_id,
      case
        when t.id is not null and m.deposito_id = t.deposito_origen_id then t.deposito_destino_id
        when t.id is not null and m.deposito_id = t.deposito_destino_id then t.deposito_origen_id
        else null
      end as contraparte_deposito_id,
      case
        when t.id is not null and m.deposito_id = t.deposito_origen_id then dd.nombre
        when t.id is not null and m.deposito_id = t.deposito_destino_id then do_.nombre
        else null
      end as contraparte_deposito_nombre,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido
    from public.movimientos_stock m
    join public.depositos d on d.id = m.deposito_id
    join public.productos p on p.id = m.producto_id
    join public.tipo_movimiento_stock tm on tm.id = m.tipo_movimiento_id
    left join public.usuarios u on u.id = m.usuario_id
    left join public.transferencias_stock t
      on m.referencia_tipo = 'transferencia' and m.referencia_id = t.id
    left join public.depositos dd on dd.id = t.deposito_destino_id
    left join public.depositos do_ on do_.id = t.deposito_origen_id
    where (p_deposito_id is null or m.deposito_id = p_deposito_id)
      and (p_producto_id is null or m.producto_id = p_producto_id)
      and (p_tipo_codigo is null or tm.codigo = p_tipo_codigo)
      and (p_desde is null or m.created_at >= p_desde::timestamptz)
      and (p_hasta is null or m.created_at < (p_hasta + 1)::timestamptz)
    order by m.created_at desc
    limit greatest(p_limite, 1);
end;
$$;

revoke all on function public.listar_movimientos_stock(uuid, uuid, text, date, date, integer) from public, anon;
grant execute on function public.listar_movimientos_stock(uuid, uuid, text, date, date, integer) to authenticated;
