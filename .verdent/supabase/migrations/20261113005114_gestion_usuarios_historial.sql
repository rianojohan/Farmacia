alter table public.ventas add column if not exists usuario_eliminado text;
alter table public.movimientos_inventario add column if not exists usuario_eliminado text;
alter table public.ventas alter column id_usuario drop not null;
alter table public.ventas drop constraint if exists ventas_id_usuario_fkey;
alter table public.ventas add constraint ventas_id_usuario_fkey foreign key (id_usuario) references auth.users(id) on delete set null;
alter table public.movimientos_inventario drop constraint if exists movimientos_inventario_id_usuario_fkey;
alter table public.movimientos_inventario add constraint movimientos_inventario_id_usuario_fkey foreign key (id_usuario) references auth.users(id) on delete set null;

create or replace function public.fn_preservar_usuario_eliminado()
returns trigger language plpgsql security definer set search_path = public as $$
declare identificacion text;
begin
  select coalesce(nombre, old.email, 'Usuario') || ' (' || old.id::text || ')' into identificacion
    from public.perfiles where user_id = old.id;
  identificacion := coalesce(identificacion, coalesce(old.email, 'Usuario') || ' (' || old.id::text || ')');
  update public.ventas set usuario_eliminado = identificacion where id_usuario = old.id;
  update public.movimientos_inventario set usuario_eliminado = identificacion where id_usuario = old.id;
  update public.bitacora set detalle = detalle || jsonb_build_object('usuario_eliminado', identificacion) where id_usuario = old.id;
  return old;
end;
$$;
drop trigger if exists preservar_usuario_eliminado on auth.users;
create trigger preservar_usuario_eliminado before delete on auth.users
  for each row execute function public.fn_preservar_usuario_eliminado();