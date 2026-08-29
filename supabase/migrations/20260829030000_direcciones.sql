-- ZonaHardware - Epica: Identidad y Accesos (HU-005)
-- Direcciones del usuario para su perfil (y, mas adelante, para el checkout).

create table if not exists public.direcciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  calle text not null,
  numero text,
  ciudad text not null,
  provincia text not null,
  codigo_postal text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_direcciones_updated_at on public.direcciones;
create trigger set_direcciones_updated_at
  before update on public.direcciones
  for each row execute function public.set_updated_at();

-- Al marcar una direccion como principal, desmarca las demas del mismo usuario.
create or replace function public.unica_direccion_principal()
returns trigger
language plpgsql
as $$
begin
  if new.principal then
    update public.direcciones
    set principal = false
    where usuario_id = new.usuario_id
      and id <> new.id
      and principal = true;
  end if;
  return new;
end;
$$;

drop trigger if exists direcciones_unica_principal on public.direcciones;
create trigger direcciones_unica_principal
  after insert or update of principal on public.direcciones
  for each row
  when (new.principal)
  execute function public.unica_direccion_principal();

alter table public.direcciones enable row level security;

drop policy if exists "direcciones_propias" on public.direcciones;
create policy "direcciones_propias"
  on public.direcciones for all
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
