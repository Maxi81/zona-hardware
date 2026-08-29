-- Fix: el embed roles(codigo, descripcion) desde usuarios devolvia null
-- para cualquier usuario autenticado normal. rol_id apuntaba bien a la
-- fila correcta, pero la tabla roles quedo con RLS habilitado (parece
-- que se activo desde el panel de Supabase) sin ninguna policy de
-- select, asi que PostgREST no podia leer la fila relacionada y el
-- embed quedaba en null -> requireRole() no encontraba el rol y
-- rechazaba a todo el mundo excepto administrador.

alter table public.roles enable row level security;

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
  on public.roles for select
  to authenticated
  using (true);
