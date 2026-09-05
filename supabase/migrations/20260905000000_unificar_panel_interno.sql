-- ZonaHardware - Unificacion del panel interno (30/08 -> 05/09/2026).
-- El profesor pidio simplificar la pagina: un unico panel para todo el
-- personal interno (administrador, encargado_deposito, vendedor, gerente),
-- con acceso a Catalogo, Stock, Transferencias, Sucursales, Revendedores,
-- Usuarios y un Dashboard con reportes reales.
--
-- Esta migracion SOLO amplia permisos de LECTURA (para que el dashboard y
-- las tablas del panel muestren datos reales a los 4 roles). Ningun permiso
-- de ESCRITURA cambia: las funciones SECURITY DEFINER que crean/modifican
-- datos (asignar_rol_usuario, crear productos, aprobar solicitudes, dar de
-- baja sucursales, solicitar/aprobar/despachar transferencias, etc.) siguen
-- exigiendo exactamente el rol que ya exigian antes de esta migracion.

create or replace function public.is_personal_interno_activo()
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
      and r.codigo in ('administrador', 'encargado_deposito', 'vendedor', 'gerente')
      and u.estado = 'activo'
  );
$$;

-- productos: antes visible completo (incluye borrador) solo para admin y
-- encargado de deposito; ahora para los 4 roles internos. Sin cambios para
-- cliente/revendedor (siguen viendo solo estado = 'publicado').
drop policy if exists "productos_select_publicado_o_admin_o_encargado" on public.productos;
create policy "productos_select_publicado_o_personal_interno"
  on public.productos for select to authenticated
  using (estado = 'publicado' or public.is_personal_interno_activo());

-- stock (tabla cruda): antes solo admin/encargado, ahora los 4 roles.
drop policy if exists "stock_select_admin_o_encargado" on public.stock;
create policy "stock_select_personal_interno"
  on public.stock for select to authenticated
  using (public.is_personal_interno_activo());

-- movimientos_stock: idem.
drop policy if exists "movimientos_stock_select_admin_o_encargado" on public.movimientos_stock;
create policy "movimientos_stock_select_personal_interno"
  on public.movimientos_stock for select to authenticated
  using (public.is_personal_interno_activo());

-- transferencias_stock: idem.
drop policy if exists "transferencias_stock_select_admin_o_encargado" on public.transferencias_stock;
create policy "transferencias_stock_select_personal_interno"
  on public.transferencias_stock for select to authenticated
  using (public.is_personal_interno_activo());

-- Dos RPCs de LECTURA (SECURITY DEFINER, bypasean RLS y validan el rol
-- adentro de la funcion) que hacian el mismo chequeo admin-o-encargado:
-- se amplian a is_personal_interno_activo(). El resto de las RPCs de
-- transferencias/stock (registrar_movimiento_stock, solicitar_transferencia,
-- resolver_transferencia, despachar_transferencia,
-- confirmar_recepcion_transferencia) son de ESCRITURA y NO se tocan: siguen
-- exigiendo administrador o encargado_deposito exactamente como antes.

create or replace function public.stock_consolidado_detalle()
returns table (producto_id uuid, sku text, nombre text, cantidad_total bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_personal_interno_activo() then
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
  if not public.is_personal_interno_activo() then
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
