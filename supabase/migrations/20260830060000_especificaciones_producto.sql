-- ZonaHardware - HU-011: falta el filtro de "especificaciones" del catalogo
-- publico. Enfoque elegido (30/08/2026): campo de texto libre por producto
-- (no un set fijo de atributos por categoria, que exigiria mucho mas diseño
-- previo por lo heterogeneas que son las specs de hardware de PC) + busqueda
-- simple (ilike) sobre ese texto desde el catalogo.

alter table public.productos
  add column if not exists especificaciones text;
