-- ZonaHardware - Epica: Stock y Movimientos (HU-024, HU-025, HU-026)
-- Requisito 2 del profesor (via tipo_movimiento_stock: todo movimiento clasificado y auditable).
--
-- HU-024: catalogo de tipos de movimiento (ingreso/egreso venta/transferencia
--         salida/transferencia entrada/ajuste), cada uno con signo (+1/-1).
-- HU-025: consultar stock por deposito puntual y consolidado de la red
--         (rol Encargado de Deposito). El stock consolidado "solo
--         disponible/sin stock" ya existia para el catalogo publico
--         (stock_consolidado(), migracion de Catalogo y Precios); esto
--         agrega la vista con cantidades reales, restringida a
--         administrador/encargado de deposito.
-- HU-026: registrar ingreso de mercaderia a un deposito. Si el producto no
--         tenia fila de stock en ese deposito, se crea en 0 antes de sumar.
--
-- Nota de alcance: HU-027 (ajustes con motivo), HU-028 (conteo fisico),
-- HU-029 (alertas de reposicion) y HU-030 (historial completo con filtros)
-- quedan para la proxima iteracion de esta epica. La funcion
-- registrar_movimiento_stock() de aca abajo ya es generica (recibe el
-- codigo de tipo_movimiento_stock), asi que esas HUs la van a poder
-- reusar sin tocar el nucleo de movimientos/stock.

create table if not exists public.tipo_movimiento_stock (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  signo smallint not null check (signo in (1, -1)),
  descripcion text
);

insert into public.tipo_movimiento_stock (codigo, signo, descripcion) values
  ('INGRESO', 1, 'Ingreso de mercaderia (compra o reposicion)'),
  ('EGRESO_VENTA', -1, 'Egreso por venta confirmada'),
  ('TRANSFERENCIA_SALIDA', -1, 'Salida por transferencia a otro deposito'),
  ('TRANSFERENCIA_ENTRADA', 1, 'Entrada por transferencia desde otro deposito'),
  ('AJUSTE', 1, 'Ajuste manual (rotura, perdida, error de carga, conteo fisico)')
on conflict (codigo) do nothing;

create table if not exists public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  deposito_id uuid not null references public.depositos(id),
  tipo_movimiento_id uuid not null references public.tipo_movimiento_stock(id),
  cantidad integer not null check (cantidad > 0),
  referencia_tipo text check (referencia_tipo in ('pedido', 'transferencia', 'ajuste')),
  referencia_id uuid,
  usuario_id uuid references public.usuarios(id),
  motivo text,
  created_at timestamptz not null default now()
);

create index if not exists movimientos_stock_producto_deposito_idx
  on public.movimientos_stock (producto_id, deposito_id, created_at desc);

-- Helper reutilizable para RLS/RPCs que requieren rol encargado_deposito activo.
create or replace function public.is_encargado_deposito_activo()
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
      and r.codigo = 'encargado_deposito'
      and u.estado = 'activo'
  );
$$;

revoke all on function public.is_encargado_deposito_activo() from public, anon;
grant execute on function public.is_encargado_deposito_activo() to authenticated;

-- Registra un movimiento y actualiza stock de forma atomica. Si el producto
-- no tenia fila de stock en ese deposito, la crea en 0 antes de aplicar el
-- movimiento (HU-026 criterio 2). El CHECK cantidad_disponible >= 0 de la
-- tabla stock evita que un egreso deje stock negativo; se atrapa ese error
-- puntual para devolver un mensaje mas claro.
create or replace function public.registrar_movimiento_stock(
  p_producto_id uuid,
  p_deposito_id uuid,
  p_tipo_codigo text,
  p_cantidad integer,
  p_motivo text default null,
  p_referencia_tipo text default null,
  p_referencia_id uuid default null
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
    referencia_tipo, referencia_id, usuario_id, motivo
  )
  values (
    p_producto_id, p_deposito_id, v_tipo_id, p_cantidad,
    p_referencia_tipo, p_referencia_id, auth.uid(), p_motivo
  )
  returning id into v_movimiento_id;

  return v_movimiento_id;
end;
$$;

revoke all on function public.registrar_movimiento_stock(uuid, uuid, text, integer, text, text, uuid) from public, anon;
grant execute on function public.registrar_movimiento_stock(uuid, uuid, text, integer, text, text, uuid) to authenticated;

-- Consolidado con cantidades reales (no solo disponible/sin stock) para el
-- panel de administrador/encargado (HU-025 criterio 2). Distinto de
-- stock_consolidado() (Catalogo y Precios), que es publico y solo da un
-- total sin exponer el desglose ni el nombre del producto fuera de rol.
create or replace function public.stock_consolidado_detalle()
returns table (producto_id uuid, sku text, nombre text, cantidad_total bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_administrador_activo() or public.is_encargado_deposito_activo()) then
    raise exception 'No tenes permiso para ver el stock consolidado';
  end if;

  return query
    select p.id, p.sku, p.nombre, coalesce(sum(s.cantidad_disponible), 0)
    from public.productos p
    left join public.stock s on s.producto_id = p.id
    group by p.id, p.sku, p.nombre
    order by p.nombre;
end;
$$;

revoke all on function public.stock_consolidado_detalle() from public, anon;
grant execute on function public.stock_consolidado_detalle() to authenticated;

alter table public.tipo_movimiento_stock enable row level security;
alter table public.movimientos_stock enable row level security;

drop policy if exists "tipo_movimiento_stock_select_authenticated" on public.tipo_movimiento_stock;
create policy "tipo_movimiento_stock_select_authenticated"
  on public.tipo_movimiento_stock for select to authenticated using (true);

drop policy if exists "tipo_movimiento_stock_write_admin" on public.tipo_movimiento_stock;
create policy "tipo_movimiento_stock_write_admin"
  on public.tipo_movimiento_stock for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

-- movimientos_stock: solo lectura via RLS (admin o encargado de deposito).
-- Toda escritura pasa por registrar_movimiento_stock() (SECURITY DEFINER),
-- igual que solicitudes_revendedor.
drop policy if exists "movimientos_stock_select_admin_o_encargado" on public.movimientos_stock;
create policy "movimientos_stock_select_admin_o_encargado"
  on public.movimientos_stock for select to authenticated
  using (public.is_administrador_activo() or public.is_encargado_deposito_activo());

revoke insert, update, delete on public.movimientos_stock from anon, authenticated;

-- El encargado de deposito tambien necesita ver el stock crudo por deposito
-- (HU-025 criterio 1), que hasta ahora era solo-administrador.
drop policy if exists "stock_select_admin_o_encargado" on public.stock;
create policy "stock_select_admin_o_encargado"
  on public.stock for select to authenticated
  using (public.is_administrador_activo() or public.is_encargado_deposito_activo());

-- El encargado de deposito tambien necesita ver productos en cualquier
-- estado (borrador incluido) para poder recibir/cargar stock antes de que
-- el producto se publique.
drop policy if exists "productos_select_publicado_o_admin" on public.productos;
create policy "productos_select_publicado_o_admin_o_encargado"
  on public.productos for select to authenticated
  using (
    estado = 'publicado'
    or public.is_administrador_activo()
    or public.is_encargado_deposito_activo()
  );
