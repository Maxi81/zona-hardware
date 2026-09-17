-- 1. Eliminar pagos_proveedor (lo reemplazamos con ordenes_pago) y funciones viejas
drop function if exists public.registrar_pago_proveedores(uuid[]) cascade;
drop table if exists public.pagos_proveedor cascade;

-- 2. Modificar registrar_transferencia_directa para no usar transferencias_stock
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
  v_referencia_id uuid;
begin
  if not (
    public.is_administrador_activo() or
    public.is_encargado_deposito_activo()
  ) then
    raise exception 'No tenes permiso para registrar transferencias de stock';
  end if;

  if p_cantidad <= 0 then
    raise exception 'La cantidad a transferir debe ser mayor a cero';
  end if;

  if p_deposito_origen_id = p_deposito_destino_id then
    raise exception 'El deposito de origen y destino no pueden ser el mismo';
  end if;

  -- Generar un UUID para enlazar ambos movimientos
  v_referencia_id := gen_random_uuid();

  -- Registrar salida del deposito origen
  perform public.registrar_movimiento_stock(
    p_producto_id,
    p_deposito_origen_id,
    'TRANSFERENCIA_SALIDA',
    p_cantidad,
    p_motivo,
    'transferencia',
    v_referencia_id
  );

  -- Registrar entrada en el deposito destino
  perform public.registrar_movimiento_stock(
    p_producto_id,
    p_deposito_destino_id,
    'TRANSFERENCIA_ENTRADA',
    p_cantidad,
    p_motivo,
    'transferencia',
    v_referencia_id
  );

  return v_referencia_id;
end;
$$;

-- Ahora podemos eliminar transferencias_stock sin romper la vista
drop table if exists public.transferencias_stock cascade;

-- Eliminar funciones obsoletas de aprobacion
drop function if exists public.solicitar_transferencia(uuid, uuid, uuid, integer, text) cascade;
drop function if exists public.resolver_transferencia(uuid, boolean) cascade;
drop function if exists public.despachar_transferencia(uuid) cascade;
drop function if exists public.confirmar_recepcion_transferencia(uuid, integer) cascade;

-- 3. Crear comprobantes_proveedor
create table if not exists public.comprobantes_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id),
  orden_compra_id uuid references public.ordenes_compra(id),
  tipo text not null check (tipo in ('factura', 'nota_debito', 'nota_credito')),
  numero text not null,
  fecha_emision timestamptz not null,
  monto_total numeric(12,2) not null check (monto_total > 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'anulado')),
  creado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_comprobantes_proveedor_updated_at on public.comprobantes_proveedor;
create trigger set_comprobantes_proveedor_updated_at
  before update on public.comprobantes_proveedor
  for each row execute function public.set_updated_at();

alter table public.comprobantes_proveedor enable row level security;
drop policy if exists "comprobantes_proveedor_select_interno" on public.comprobantes_proveedor;
create policy "comprobantes_proveedor_select_interno"
  on public.comprobantes_proveedor for select to authenticated
  using (public.is_personal_interno_activo());
revoke insert, update, delete on public.comprobantes_proveedor from anon, authenticated;

-- 4. Crear ordenes_pago
create table if not exists public.ordenes_pago (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  proveedor_id uuid not null references public.proveedores(id),
  fecha timestamptz not null default now(),
  monto_total numeric(12,2) not null check (monto_total > 0),
  notas text,
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

alter table public.ordenes_pago enable row level security;
drop policy if exists "ordenes_pago_select_interno" on public.ordenes_pago;
create policy "ordenes_pago_select_interno"
  on public.ordenes_pago for select to authenticated
  using (public.is_personal_interno_activo());
revoke insert, update, delete on public.ordenes_pago from anon, authenticated;

-- 5. Crear orden_pago_comprobantes
create table if not exists public.orden_pago_comprobantes (
  orden_pago_id uuid not null references public.ordenes_pago(id) on delete cascade,
  comprobante_id uuid not null references public.comprobantes_proveedor(id) on delete restrict,
  monto_pagado numeric(12,2) not null check (monto_pagado > 0),
  primary key (orden_pago_id, comprobante_id)
);

alter table public.orden_pago_comprobantes enable row level security;
drop policy if exists "orden_pago_comprobantes_select_interno" on public.orden_pago_comprobantes;
create policy "orden_pago_comprobantes_select_interno"
  on public.orden_pago_comprobantes for select to authenticated
  using (public.is_personal_interno_activo());
revoke insert, update, delete on public.orden_pago_comprobantes from anon, authenticated;

-- 6. RPC para crear comprobante
create or replace function public.registrar_comprobante_proveedor(
  p_proveedor_id uuid,
  p_tipo text,
  p_numero text,
  p_fecha_emision timestamptz,
  p_monto_total numeric,
  p_orden_compra_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede registrar comprobantes';
  end if;
  
  insert into public.comprobantes_proveedor (
    proveedor_id, tipo, numero, fecha_emision, monto_total, orden_compra_id, creado_por
  ) values (
    p_proveedor_id, p_tipo, p_numero, p_fecha_emision, p_monto_total, p_orden_compra_id, auth.uid()
  ) returning id into v_id;
  
  return v_id;
end;
$$;

revoke all on function public.registrar_comprobante_proveedor(uuid, text, text, timestamptz, numeric, uuid) from public, anon;
grant execute on function public.registrar_comprobante_proveedor(uuid, text, text, timestamptz, numeric, uuid) to authenticated;

-- 7. RPC para listar deuda proveedores actualizada
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
      p.id as proveedor_id,
      p.nombre as proveedor_nombre,
      coalesce(sum(
        case 
          when c.tipo in ('factura', 'nota_debito') then c.monto_total
          else 0
        end
      ), 0) as monto_recibido,
      coalesce(sum(
        case 
          when c.tipo = 'nota_credito' then c.monto_total
          else 0
        end
      ), 0) + coalesce(
        (select sum(op.monto_total) from public.ordenes_pago op where op.proveedor_id = p.id), 0
      ) as monto_pagado,
      coalesce(sum(
        case 
          when c.tipo in ('factura', 'nota_debito') then c.monto_total
          when c.tipo = 'nota_credito' then -c.monto_total
          else 0
        end
      ), 0) - coalesce(
        (select sum(op.monto_total) from public.ordenes_pago op where op.proveedor_id = p.id), 0
      ) as deuda
    from public.proveedores p
    left join public.comprobantes_proveedor c on c.proveedor_id = p.id and c.estado <> 'anulado'
    group by p.id, p.nombre
    having coalesce(sum(
        case 
          when c.tipo in ('factura', 'nota_debito') then c.monto_total
          when c.tipo = 'nota_credito' then -c.monto_total
          else 0
        end
      ), 0) - coalesce(
        (select sum(op.monto_total) from public.ordenes_pago op where op.proveedor_id = p.id), 0
      ) > 0
    order by deuda desc;
end;
$$;

revoke all on function public.listar_deuda_proveedores() from public, anon;
grant execute on function public.listar_deuda_proveedores() to authenticated;

-- 8. RPC para emitir orden de pago (pagar comprobantes seleccionados)
create or replace function public.crear_orden_pago(
  p_proveedor_id uuid,
  p_comprobantes_ids uuid[],
  p_notas text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op_id uuid;
  v_monto_total numeric := 0;
  v_comprobante record;
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede crear ordenes de pago';
  end if;

  if p_comprobantes_ids is null or array_length(p_comprobantes_ids, 1) is null then
    raise exception 'Debe seleccionar al menos un comprobante';
  end if;

  -- Calcular total
  for v_comprobante in 
    select id, tipo, monto_total 
    from public.comprobantes_proveedor 
    where id = any(p_comprobantes_ids) 
      and proveedor_id = p_proveedor_id 
      and estado = 'pendiente'
  loop
    if v_comprobante.tipo in ('factura', 'nota_debito') then
      v_monto_total := v_monto_total + v_comprobante.monto_total;
    else
      -- nota de credito resta del pago
      v_monto_total := v_monto_total - v_comprobante.monto_total;
    end if;
  end loop;

  if v_monto_total <= 0 then
    raise exception 'El monto total a pagar debe ser mayor a cero (revisa si hay demasiadas notas de credito)';
  end if;

  insert into public.ordenes_pago (proveedor_id, monto_total, notas, registrado_por)
  values (p_proveedor_id, v_monto_total, p_notas, auth.uid())
  returning id into v_op_id;

  -- Insertar items y actualizar comprobantes
  for v_comprobante in 
    select id, tipo, monto_total 
    from public.comprobantes_proveedor 
    where id = any(p_comprobantes_ids) 
      and proveedor_id = p_proveedor_id 
      and estado = 'pendiente'
  loop
    insert into public.orden_pago_comprobantes (orden_pago_id, comprobante_id, monto_pagado)
    values (v_op_id, v_comprobante.id, v_comprobante.monto_total);

    update public.comprobantes_proveedor 
    set estado = 'pagado' 
    where id = v_comprobante.id;
  end loop;

  return v_op_id;
end;
$$;

revoke all on function public.crear_orden_pago(uuid, uuid[], text) from public, anon;
grant execute on function public.crear_orden_pago(uuid, uuid[], text) to authenticated;

-- 9. RPC para listar comprobantes pendientes
create or replace function public.listar_comprobantes_pendientes(p_proveedor_id uuid)
returns table (
  id uuid,
  tipo text,
  numero text,
  fecha_emision timestamptz,
  monto_total numeric,
  orden_compra_id uuid,
  orden_compra_numero bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede ver comprobantes pendientes';
  end if;

  return query
    select 
      c.id, c.tipo, c.numero, c.fecha_emision, c.monto_total, c.orden_compra_id, oc.numero as orden_compra_numero
    from public.comprobantes_proveedor c
    left join public.ordenes_compra oc on oc.id = c.orden_compra_id
    where c.proveedor_id = p_proveedor_id and c.estado = 'pendiente'
    order by c.fecha_emision asc;
end;
$$;

revoke all on function public.listar_comprobantes_pendientes(uuid) from public, anon;
grant execute on function public.listar_comprobantes_pendientes(uuid) to authenticated;

-- 10. RPC para listar cuenta corriente
create or replace function public.listar_cuenta_corriente_proveedor(p_proveedor_id uuid)
returns table (
  fecha timestamptz,
  tipo text,
  numero text,
  monto_debe numeric,
  monto_haber numeric,
  detalle text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_administrador_activo() then
    raise exception 'Solo un administrador puede ver la cuenta corriente';
  end if;

  return query
    select 
      c.fecha_emision as fecha,
      c.tipo,
      c.numero,
      case when c.tipo in ('factura', 'nota_debito') then c.monto_total else 0 end as monto_debe,
      case when c.tipo = 'nota_credito' then c.monto_total else 0 end as monto_haber,
      'Comprobante ' || c.tipo || ' ' || c.numero as detalle
    from public.comprobantes_proveedor c
    where c.proveedor_id = p_proveedor_id and c.estado <> 'anulado'
    
    union all
    
    select
      op.fecha,
      'pago' as tipo,
      'OP-' || op.numero as numero,
      0 as monto_debe,
      op.monto_total as monto_haber,
      'Orden de Pago OP-' || op.numero as detalle
    from public.ordenes_pago op
    where op.proveedor_id = p_proveedor_id
    
    order by fecha asc;
end;
$$;

revoke all on function public.listar_cuenta_corriente_proveedor(uuid) from public, anon;
grant execute on function public.listar_cuenta_corriente_proveedor(uuid) to authenticated;
