-- ZonaHardware - Compras y Proveedores (10/09/2026)
-- Epica nueva pedida por el profesor. Backlog: HU-076 a HU-081 (Sprint 2,
-- ZonaHardware_Backlog_v2.xlsx).
--
-- Decisiones de negocio ya confirmadas con el usuario (no se vuelven a
-- preguntar):
-- a) Un deposito por Orden de Compra (OC) -- no se reparte entre depositos.
-- b) La recepcion del remito genera el Ingreso en Movimientos de Stock con
--    referencia real a la OC (referencia_tipo='orden_compra', referencia_id
--    = id de la OC). Se reusan las columnas proveedor/orden_compra (texto
--    libre, agregadas en 20260910000000_movimientos_stock_unificado.sql)
--    para mostrar el nombre real del proveedor y el numero de OC en el
--    historial de Movimientos de Stock sin tocar listar_movimientos_stock.
--    El campo de texto libre que ya existia en registrarIngreso queda
--    intacto para compras informales sin OC formal.
-- c) Por ahora SOLO se implementa recepcion TOTAL. cantidad_recibida se
--    guarda por item desde el dia uno (para habilitar recepcion parcial en
--    el futuro sin otra migracion), pero como hoy solo hay recepcion total,
--    registrar_remito() no pide cantidades por item: las completa
--    automaticamente con cantidad_pedida. El dia que se implemente parcial,
--    esa funcion (o una nueva) va a poder escribir cantidad_recibida menor
--    a cantidad_pedida sin tocar el schema.
-- d) Emitir OC: solo cambia estado (borrador -> emitida). El envio por mail
--    NO es funcional todavia.
-- e) Pago a proveedores: solo registra el evento (no hay pasarela real).
--    Administrador ve la deuda de todos los proveedores y puede "pagar" una,
--    varias o todas de una: cada pago inserta un registro que salda la
--    deuda pendiente de ese proveedor en ese momento.
--
-- Ajuste de diseno respecto de la propuesta original (revisado releyendo
-- las migraciones/actions existentes antes de escribir esto, como se pidio):
-- se saco el parametro "items jsonb" de registrar_remito() -- la recepcion
-- parcial no esta en alcance todavia (ver c), asi que la funcion recibe
-- solo el id de la OC y completa cantidad_recibida = cantidad_pedida.
--
-- Roles de acceso (criterio propio, avisado al usuario): igual que
-- Movimientos de Stock, LECTURA es para is_personal_interno_activo() (los 4
-- roles internos). ESCRITURA: crear/emitir OC y registrar pagos son
-- administrador-only (igual que crear_sucursal, crear producto, etc.);
-- cargar el remito de recepcion es administrador O encargado_deposito
-- (afecta el stock de su deposito, mismo criterio que
-- registrar_movimiento_stock). Pagos a proveedores (tabla y RPCs de deuda)
-- quedan administrador-only tambien para lectura, por ser informacion
-- financiera.

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cuit text,
  email text,
  telefono text,
  direccion text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_proveedores_updated_at on public.proveedores;
create trigger set_proveedores_updated_at
  before update on public.proveedores
  for each row execute function public.set_updated_at();

create table if not exists public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  proveedor_id uuid not null references public.proveedores(id),
  deposito_id uuid not null references public.depositos(id),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'emitida', 'recibida', 'cancelada')),
  fecha_creacion timestamptz not null default now(),
  fecha_emision timestamptz,
  fecha_recepcion timestamptz,
  creado_por uuid references public.usuarios(id),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ordenes_compra_proveedor_idx on public.ordenes_compra (proveedor_id);
create index if not exists ordenes_compra_estado_idx on public.ordenes_compra (estado);

drop trigger if exists set_ordenes_compra_updated_at on public.ordenes_compra;
create trigger set_ordenes_compra_updated_at
  before update on public.ordenes_compra
  for each row execute function public.set_updated_at();

create table if not exists public.orden_compra_items (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.ordenes_compra(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  cantidad_pedida integer not null check (cantidad_pedida > 0),
  cantidad_recibida integer not null default 0 check (cantidad_recibida >= 0),
  precio_unitario numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orden_compra_items_oc_idx on public.orden_compra_items (orden_compra_id);

drop trigger if exists set_orden_compra_items_updated_at on public.orden_compra_items;
create trigger set_orden_compra_items_updated_at
  before update on public.orden_compra_items
  for each row execute function public.set_updated_at();

create table if not exists public.pagos_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id),
  monto numeric(12,2) not null check (monto > 0),
  fecha timestamptz not null default now(),
  registrado_por uuid references public.usuarios(id),
  orden_compra_id uuid references public.ordenes_compra(id),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists pagos_proveedor_proveedor_idx on public.pagos_proveedor (proveedor_id);

-- El CHECK de referencia_tipo en movimientos_stock (definido inline en
-- 20260830010000_stock_movimientos.sql, sin nombre explicito -> Postgres le
-- puso el nombre por defecto <tabla>_<columna>_check) necesita sumar
-- 'orden_compra' a la lista de valores permitidos (ver decision b).
alter table public.movimientos_stock
  drop constraint if exists movimientos_stock_referencia_tipo_check;
alter table public.movimientos_stock
  add constraint movimientos_stock_referencia_tipo_check
  check (referencia_tipo in ('pedido', 'transferencia', 'ajuste', 'orden_compra'));

-- Alta/CRUD simple de proveedores (HU-076): igual que categorias/marcas,
-- pasa por RLS directo (no RPC), porque no hay logica atomica involucrada.
create or replace function public.crear_orden_compra(
  p_proveedor_id uuid,
  p_deposito_id uuid,
  p_items jsonb,
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orden_id uuid;
  v_item jsonb;
  v_producto_id uuid;
  v_cantidad integer;
  v_precio numeric(12,2);
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede crear ordenes de compra';
  end if;

  if p_proveedor_id is null or p_deposito_id is null then
    raise exception 'Proveedor y deposito son obligatorios';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La orden de compra necesita al menos un item';
  end if;

  insert into public.ordenes_compra (proveedor_id, deposito_id, notas, creado_por)
  values (p_proveedor_id, p_deposito_id, p_notas, auth.uid())
  returning id into v_orden_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad_pedida')::integer;
    v_precio := nullif(v_item ->> 'precio_unitario', '')::numeric(12,2);

    if v_producto_id is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cada item necesita un producto y una cantidad mayor a 0';
    end if;

    insert into public.orden_compra_items (
      orden_compra_id, producto_id, cantidad_pedida, precio_unitario
    ) values (
      v_orden_id, v_producto_id, v_cantidad, v_precio
    );
  end loop;

  return v_orden_id;
end;
$$;

revoke all on function public.crear_orden_compra(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.crear_orden_compra(uuid, uuid, jsonb, text) to authenticated;

create or replace function public.emitir_orden_compra(p_orden_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede emitir ordenes de compra';
  end if;

  select estado into v_estado
  from public.ordenes_compra
  where id = p_orden_compra_id
  for update;

  if v_estado is null then
    raise exception 'Orden de compra no encontrada';
  end if;

  if v_estado <> 'borrador' then
    raise exception 'Solo se puede emitir una orden de compra en borrador';
  end if;

  update public.ordenes_compra
  set estado = 'emitida', fecha_emision = now()
  where id = p_orden_compra_id;
end;
$$;

revoke all on function public.emitir_orden_compra(uuid) from public, anon;
grant execute on function public.emitir_orden_compra(uuid) to authenticated;

-- Recepcion total del remito (ver ajuste de diseno arriba): completa
-- cantidad_recibida = cantidad_pedida para cada item, genera un Ingreso de
-- stock por item (referencia_tipo='orden_compra', reusa
-- registrar_movimiento_stock igual que registrar_transferencia_directa) y
-- pasa la OC a 'recibida'.
create or replace function public.registrar_remito(p_orden_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oc public.ordenes_compra;
  v_proveedor_nombre text;
  v_numero_oc text;
  v_item record;
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para cargar el remito de esta orden de compra';
  end if;

  select * into v_oc
  from public.ordenes_compra
  where id = p_orden_compra_id
  for update;

  if v_oc.id is null then
    raise exception 'Orden de compra no encontrada';
  end if;

  if v_oc.estado <> 'emitida' then
    raise exception 'Solo se puede cargar el remito de una orden de compra emitida';
  end if;

  select nombre into v_proveedor_nombre
  from public.proveedores
  where id = v_oc.proveedor_id;

  v_numero_oc := 'OC-' || lpad(v_oc.numero::text, 4, '0');

  for v_item in
    select id, producto_id, cantidad_pedida
    from public.orden_compra_items
    where orden_compra_id = p_orden_compra_id
  loop
    update public.orden_compra_items
    set cantidad_recibida = v_item.cantidad_pedida
    where id = v_item.id;

    perform public.registrar_movimiento_stock(
      v_item.producto_id,
      v_oc.deposito_id,
      'INGRESO',
      v_item.cantidad_pedida,
      'Recepcion de remito ' || v_numero_oc,
      'orden_compra',
      p_orden_compra_id,
      v_proveedor_nombre,
      v_numero_oc
    );
  end loop;

  update public.ordenes_compra
  set estado = 'recibida', fecha_recepcion = now()
  where id = p_orden_compra_id;
end;
$$;

revoke all on function public.registrar_remito(uuid) from public, anon;
grant execute on function public.registrar_remito(uuid) to authenticated;

-- Historial "aplanado" de OCs, mismo criterio que listar_movimientos_stock:
-- evita resolver en el cliente los joins/monto total, y evita el problema
-- conocido de embeds ambiguos.
create or replace function public.listar_ordenes_compra(
  p_estado text default null,
  p_proveedor_id uuid default null,
  p_deposito_id uuid default null,
  p_limite integer default 100
)
returns table (
  id uuid,
  numero bigint,
  proveedor_id uuid,
  proveedor_nombre text,
  deposito_id uuid,
  deposito_nombre text,
  estado text,
  fecha_creacion timestamptz,
  fecha_emision timestamptz,
  fecha_recepcion timestamptz,
  notas text,
  monto_total numeric,
  cantidad_items integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_personal_interno_activo() then
    raise exception 'No tenes permiso para ver las ordenes de compra';
  end if;

  return query
    select
      oc.id,
      oc.numero,
      oc.proveedor_id,
      p.nombre as proveedor_nombre,
      oc.deposito_id,
      d.nombre as deposito_nombre,
      oc.estado,
      oc.fecha_creacion,
      oc.fecha_emision,
      oc.fecha_recepcion,
      oc.notas,
      coalesce(sum(oci.cantidad_pedida * coalesce(oci.precio_unitario, 0)), 0) as monto_total,
      count(oci.id)::integer as cantidad_items
    from public.ordenes_compra oc
    join public.proveedores p on p.id = oc.proveedor_id
    join public.depositos d on d.id = oc.deposito_id
    left join public.orden_compra_items oci on oci.orden_compra_id = oc.id
    where (p_estado is null or oc.estado = p_estado)
      and (p_proveedor_id is null or oc.proveedor_id = p_proveedor_id)
      and (p_deposito_id is null or oc.deposito_id = p_deposito_id)
    group by oc.id, p.nombre, d.nombre
    order by oc.fecha_creacion desc
    limit greatest(p_limite, 1);
end;
$$;

revoke all on function public.listar_ordenes_compra(text, uuid, uuid, integer) from public, anon;
grant execute on function public.listar_ordenes_compra(text, uuid, uuid, integer) to authenticated;

-- Deuda pendiente por proveedor = total de OCs recibidas - total pagado
-- (los pagos pueden ser generales, orden_compra_id null, o contra una OC
-- puntual; para el calculo de deuda no importa, se suman todos).
create or replace function public.listar_deuda_proveedores()
returns table (
  proveedor_id uuid,
  proveedor_nombre text,
  monto_recibido numeric,
  monto_pagado numeric,
  deuda numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede ver la deuda a proveedores';
  end if;

  return query
    select
      p.id,
      p.nombre,
      coalesce(r.monto_recibido, 0) as monto_recibido,
      coalesce(pg.monto_pagado, 0) as monto_pagado,
      coalesce(r.monto_recibido, 0) - coalesce(pg.monto_pagado, 0) as deuda
    from public.proveedores p
    left join (
      select oc.proveedor_id, sum(oci.cantidad_pedida * coalesce(oci.precio_unitario, 0)) as monto_recibido
      from public.ordenes_compra oc
      join public.orden_compra_items oci on oci.orden_compra_id = oc.id
      where oc.estado = 'recibida'
      group by oc.proveedor_id
    ) r on r.proveedor_id = p.id
    left join (
      select proveedor_id, sum(monto) as monto_pagado
      from public.pagos_proveedor
      group by proveedor_id
    ) pg on pg.proveedor_id = p.id
    where coalesce(r.monto_recibido, 0) - coalesce(pg.monto_pagado, 0) > 0
    order by deuda desc;
end;
$$;

revoke all on function public.listar_deuda_proveedores() from public, anon;
grant execute on function public.listar_deuda_proveedores() to authenticated;

-- Pagar uno, varios o todos los proveedores seleccionados: por cada uno,
-- calcula su deuda pendiente actual y, si es mayor a 0, inserta un pago que
-- la salda por completo (evento simple, sin pasarela real -- ver decision e).
create or replace function public.registrar_pago_proveedores(p_proveedor_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proveedor_id uuid;
  v_deuda numeric;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede registrar pagos a proveedores';
  end if;

  if p_proveedor_ids is null or array_length(p_proveedor_ids, 1) is null then
    raise exception 'Elegi al menos un proveedor para pagar';
  end if;

  foreach v_proveedor_id in array p_proveedor_ids
  loop
    select
      coalesce((
        select sum(oci.cantidad_pedida * coalesce(oci.precio_unitario, 0))
        from public.ordenes_compra oc
        join public.orden_compra_items oci on oci.orden_compra_id = oc.id
        where oc.estado = 'recibida' and oc.proveedor_id = v_proveedor_id
      ), 0)
      -
      coalesce((
        select sum(monto)
        from public.pagos_proveedor
        where proveedor_id = v_proveedor_id
      ), 0)
    into v_deuda;

    if v_deuda is not null and v_deuda > 0 then
      insert into public.pagos_proveedor (proveedor_id, monto, registrado_por)
      values (v_proveedor_id, v_deuda, auth.uid());
    end if;
  end loop;
end;
$$;

revoke all on function public.registrar_pago_proveedores(uuid[]) from public, anon;
grant execute on function public.registrar_pago_proveedores(uuid[]) to authenticated;

alter table public.proveedores enable row level security;
alter table public.ordenes_compra enable row level security;
alter table public.orden_compra_items enable row level security;
alter table public.pagos_proveedor enable row level security;

drop policy if exists "proveedores_select_personal_interno" on public.proveedores;
create policy "proveedores_select_personal_interno"
  on public.proveedores for select to authenticated
  using (public.is_personal_interno_activo());

drop policy if exists "proveedores_write_admin" on public.proveedores;
create policy "proveedores_write_admin"
  on public.proveedores for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

drop policy if exists "ordenes_compra_select_personal_interno" on public.ordenes_compra;
create policy "ordenes_compra_select_personal_interno"
  on public.ordenes_compra for select to authenticated
  using (public.is_personal_interno_activo());

revoke insert, update, delete on public.ordenes_compra from anon, authenticated;

drop policy if exists "orden_compra_items_select_personal_interno" on public.orden_compra_items;
create policy "orden_compra_items_select_personal_interno"
  on public.orden_compra_items for select to authenticated
  using (public.is_personal_interno_activo());

revoke insert, update, delete on public.orden_compra_items from anon, authenticated;

drop policy if exists "pagos_proveedor_select_admin" on public.pagos_proveedor;
create policy "pagos_proveedor_select_admin"
  on public.pagos_proveedor for select to authenticated
  using (public.is_administrador_activo());

revoke insert, update, delete on public.pagos_proveedor from anon, authenticated;
