-- ZonaHardware - Epica: Catalogo y Precios (HU-007, HU-008, HU-011)
-- HU-007: alta y mantenimiento de productos (admin).
-- HU-008: organizar productos en categorias y marcas, filtrables en el catalogo.
-- HU-011: catalogo publico (cliente/revendedor) con stock consolidado y filtros.
--
-- Nota de alcance: HU-011 pide mostrar "Disponible"/"Sin stock" por producto,
-- lo que requiere una nocion minima de stock aunque la epica completa de Stock
-- y Movimientos (HU-024 a HU-030, con tipo_movimiento_stock/movimientos_stock/
-- transferencias y flujos de aprobacion) todavia no se construyo. Se agrega
-- aca SOLO la tabla `stock` (cantidad actual por producto+deposito, tal cual
-- el diccionario de datos la define) como base minima para poder calcular el
-- estado del catalogo. Movimientos con historial/motivo/transferencias entre
-- depositos quedan para esa proxima epica.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_padre_id uuid references public.categorias(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_categorias_updated_at on public.categorias;
create trigger set_categorias_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();

create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_marcas_updated_at on public.marcas;
create trigger set_marcas_updated_at
  before update on public.marcas
  for each row execute function public.set_updated_at();

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nombre text not null,
  descripcion text,
  categoria_id uuid not null references public.categorias(id),
  marca_id uuid not null references public.marcas(id),
  precio_b2c numeric(12,2) not null check (precio_b2c >= 0),
  precio_b2b numeric(12,2) check (precio_b2b is null or precio_b2b >= 0),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'publicado', 'baja')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_productos_updated_at on public.productos;
create trigger set_productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

create table if not exists public.producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  url text not null,
  orden integer not null default 0
);

-- Base minima de stock (ver nota de alcance arriba). cantidad_reservada y
-- punto_reposicion ya estan en el diccionario de datos para no tener que
-- alterar la tabla cuando se construya la epica de Stock y Movimientos.
create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  deposito_id uuid not null references public.depositos(id),
  cantidad_disponible integer not null default 0 check (cantidad_disponible >= 0),
  cantidad_reservada integer not null default 0 check (cantidad_reservada >= 0),
  punto_reposicion integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (producto_id, deposito_id)
);

drop trigger if exists set_stock_updated_at on public.stock;
create trigger set_stock_updated_at
  before update on public.stock
  for each row execute function public.set_updated_at();

-- Total de stock disponible por producto, sumado entre todos los depositos.
-- SECURITY DEFINER para que cliente/revendedor puedan calcular "Disponible"/
-- "Sin stock" en el catalogo (HU-011) sin necesitar acceso directo a la
-- tabla stock, que queda restringida a administrador (maneja cantidades por
-- deposito, informacion interna).
create or replace function public.stock_consolidado()
returns table (producto_id uuid, cantidad_disponible bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.producto_id, coalesce(sum(s.cantidad_disponible), 0)
  from public.stock s
  group by s.producto_id;
$$;

revoke all on function public.stock_consolidado() from public, anon;
grant execute on function public.stock_consolidado() to authenticated;

alter table public.categorias enable row level security;
alter table public.marcas enable row level security;
alter table public.productos enable row level security;
alter table public.producto_imagenes enable row level security;
alter table public.stock enable row level security;

-- Categorias y marcas: catalogo simple, lectura abierta a cualquier
-- autenticado (patron ya usado para roles/depositos/sucursales), escritura
-- solo administrador.
drop policy if exists "categorias_select_authenticated" on public.categorias;
create policy "categorias_select_authenticated"
  on public.categorias for select to authenticated using (true);

drop policy if exists "categorias_write_admin" on public.categorias;
create policy "categorias_write_admin"
  on public.categorias for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

drop policy if exists "marcas_select_authenticated" on public.marcas;
create policy "marcas_select_authenticated"
  on public.marcas for select to authenticated using (true);

drop policy if exists "marcas_write_admin" on public.marcas;
create policy "marcas_write_admin"
  on public.marcas for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

-- Productos: el catalogo publico solo debe ver "publicado" (HU-007
-- criterio 3: dado de baja desaparece del catalogo). Administrador ve todo
-- (borrador/publicado/baja) para poder gestionarlo.
drop policy if exists "productos_select_publicado_o_admin" on public.productos;
create policy "productos_select_publicado_o_admin"
  on public.productos for select to authenticated
  using (estado = 'publicado' or public.is_administrador_activo());

drop policy if exists "productos_write_admin" on public.productos;
create policy "productos_write_admin"
  on public.productos for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

drop policy if exists "producto_imagenes_select_authenticated" on public.producto_imagenes;
create policy "producto_imagenes_select_authenticated"
  on public.producto_imagenes for select to authenticated using (true);

drop policy if exists "producto_imagenes_write_admin" on public.producto_imagenes;
create policy "producto_imagenes_write_admin"
  on public.producto_imagenes for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());

-- Stock crudo (por deposito) es informacion interna: solo administrador la
-- lee/escribe directo. Cliente/revendedor usan stock_consolidado() de arriba.
drop policy if exists "stock_admin" on public.stock;
create policy "stock_admin"
  on public.stock for all to authenticated
  using (public.is_administrador_activo())
  with check (public.is_administrador_activo());
