-- ============================================================================
-- Solo la Salud - Esquema seguro (PostgreSQL / Supabase)
-- Aplica: tablas, roles, políticas RLS, funciones RPC y bitácora de auditoría.
-- Es idempotente: puede ejecutarse sobre una base de datos vacía o ya migrada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla de perfiles: vincula cada usuario de autenticación con su rol.
-- Roles: 'admin' (acceso total) y 'empleado' (consultar, agregar, vender).
-- ----------------------------------------------------------------------------
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default 'Usuario',
  rol    text not null default 'empleado' check (rol in ('admin', 'empleado')),
  creado_en timestamptz not null default now()
);

-- Todo usuario nuevo nace con rol 'empleado' (mínimo privilegio).
-- Solo un administrador autorizado puede asignar el rol de administrador.
create or replace function public.fn_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (user_id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), new.email, 'Usuario'),
    'empleado'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_nuevo_usuario();

-- ----------------------------------------------------------------------------
-- Funciones de apoyo para políticas RLS.
-- ----------------------------------------------------------------------------
create or replace function public.fn_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where user_id = auth.uid()
$$;

create or replace function public.fn_es_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.fn_rol() = 'admin', false)
$$;

-- ----------------------------------------------------------------------------
-- Tablas de negocio.
-- ----------------------------------------------------------------------------
create table if not exists public.proveedores (
  id_proveedor bigint generated always as identity primary key,
  nombre       text not null,
  telefono     text not null,
  correo       text,
  direccion    text,
  creado_en    timestamptz not null default now()
);

create table if not exists public.productos (
  id_producto     bigint generated always as identity primary key,
  codigo          text not null unique,
  nombre          text not null,
  categoria       text not null,
  precio          numeric(12,2) not null check (precio >= 0),
  cantidad        integer not null default 0 check (cantidad >= 0),
  fecha_vencimiento date not null,
  id_proveedor    bigint references public.proveedores (id_proveedor) on delete set null,
  creado_en       timestamptz not null default now()
);

create table if not exists public.ventas (
  id_venta  bigint generated always as identity primary key,
  fecha     date not null default current_date,
  id_usuario uuid not null references auth.users (id),
  total     numeric(14,2) not null check (total >= 0)
);

create table if not exists public.venta_items (
  id          bigint generated always as identity primary key,
  id_venta    bigint not null references public.ventas (id_venta) on delete cascade,
  id_producto bigint not null references public.productos (id_producto),
  nombre      text not null,
  cantidad    integer not null check (cantidad > 0),
  precio      numeric(12,2) not null
);

create table if not exists public.movimientos_inventario (
  id_inventario bigint generated always as identity primary key,
  id_producto   bigint not null references public.productos (id_producto) on delete cascade,
  tipo          text not null check (tipo in ('entrada', 'salida')),
  cantidad      integer not null check (cantidad > 0),
  fecha         date not null default current_date,
  id_usuario    uuid references auth.users (id)
);

create table if not exists public.compras (
  id_compra   bigint generated always as identity primary key,
  fecha       date not null default current_date,
  id_proveedor bigint references public.proveedores (id_proveedor),
  total       numeric(14,2) not null check (total >= 0)
);

-- Bitácora de auditoría: quién hizo qué y cuándo. Solo lectura para admin.
create table if not exists public.bitacora (
  id        bigint generated always as identity primary key,
  fecha     timestamptz not null default now(),
  id_usuario uuid references public.perfiles (user_id) on delete set null,
  accion    text not null,
  detalle   jsonb not null default '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- Registro de ventas: función transaccional con validación de existencias.
-- Descuenta inventario, registra movimientos y escribe en la bitácora en una
-- sola transacción. La usan admin y empleado.
-- ----------------------------------------------------------------------------
create or replace function public.registrar_venta(items jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_total numeric(14,2) := 0;
  it jsonb;
  v_prod public.productos;
  v_cant integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar una venta';
  end if;
  if public.fn_rol() is null then
    raise exception 'Tu usuario no tiene un perfil asignado';
  end if;
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  -- Valida existencia y bloquea las filas para evitar ventas concurrentes.
  for it in select * from jsonb_array_elements(items) loop
    v_cant := (it->>'cantidad')::int;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad inválida en la venta';
    end if;
    select * into v_prod from public.productos
      where id_producto = (it->>'idProducto')::bigint
      for update;
    if v_prod is null then
      raise exception 'Producto no encontrado: %', it->>'idProducto';
    end if;
    if v_prod.cantidad < v_cant then
      raise exception 'Stock insuficiente de % (disponible: %)', v_prod.nombre, v_prod.cantidad;
    end if;
    v_total := v_total + v_prod.precio * v_cant;
  end loop;

  insert into public.ventas (id_usuario, total)
    values (auth.uid(), v_total)
    returning id_venta into v_id;

  for it in select * from jsonb_array_elements(items) loop
    v_cant := (it->>'cantidad')::int;
    insert into public.venta_items (id_venta, id_producto, nombre, cantidad, precio)
      select v_id, p.id_producto, p.nombre, v_cant, p.precio
      from public.productos p
      where p.id_producto = (it->>'idProducto')::bigint;
    update public.productos
      set cantidad = cantidad - v_cant
      where id_producto = (it->>'idProducto')::bigint;
    insert into public.movimientos_inventario (id_producto, tipo, cantidad, id_usuario)
      values ((it->>'idProducto')::bigint, 'salida', v_cant, auth.uid());
  end loop;

  insert into public.bitacora (id_usuario, accion, detalle)
    values (auth.uid(), 'venta_registrada',
            jsonb_build_object('idVenta', v_id, 'total', v_total, 'items', items));
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Entradas de inventario: transaccional, con bitácora. Ambos roles.
-- ----------------------------------------------------------------------------
create or replace function public.registrar_entrada(p_id_producto bigint, p_cantidad integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_nuevo integer;
begin
  if auth.uid() is null or public.fn_rol() is null then
    raise exception 'Sin permisos para registrar entradas';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  update public.productos
    set cantidad = cantidad + p_cantidad
    where id_producto = p_id_producto
    returning cantidad into v_nuevo;

  if v_nuevo is null then
    raise exception 'Producto no encontrado';
  end if;

  insert into public.movimientos_inventario (id_producto, tipo, cantidad, id_usuario)
    values (p_id_producto, 'entrada', p_cantidad, auth.uid());
  insert into public.bitacora (id_usuario, accion, detalle)
    values (auth.uid(), 'entrada_inventario',
            jsonb_build_object('idProducto', p_id_producto, 'cantidad', p_cantidad));
  return v_nuevo;
end;
$$;

-- ----------------------------------------------------------------------------
-- Bitácora automática de cambios en catálogo (productos y proveedores).
-- ----------------------------------------------------------------------------
create or replace function public.fn_audit_catalogo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle jsonb;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := coalesce(to_jsonb(old)->>'id_producto', to_jsonb(old)->>'id_proveedor');
    v_detalle := jsonb_build_object('id', v_id, 'nombre', old.nombre);
  else
    v_id := coalesce(to_jsonb(new)->>'id_producto', to_jsonb(new)->>'id_proveedor');
    v_detalle := jsonb_build_object('id', v_id, 'nombre', new.nombre);
  end if;

  insert into public.bitacora (id_usuario, accion, detalle)
    values (auth.uid(), lower(tg_table_name) || '_' || lower(tg_op), v_detalle);
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_productos on public.productos;
create trigger audit_productos
  after insert or update or delete on public.productos
  for each row execute function public.fn_audit_catalogo();

drop trigger if exists audit_proveedores on public.proveedores;
create trigger audit_proveedores
  after insert or update or delete on public.proveedores
  for each row execute function public.fn_audit_catalogo();

-- ============================================================================
-- Row Level Security: los permisos se aplican en la base de datos, no solo
-- en la interfaz. Un empleado con una sesión válida NO puede editar ni
-- eliminar registros aunque manipule las peticiones desde el navegador.
-- ============================================================================
alter table public.perfiles              enable row level security;
alter table public.productos             enable row level security;
alter table public.proveedores           enable row level security;
alter table public.ventas                enable row level security;
alter table public.venta_items           enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.compras               enable row level security;
alter table public.bitacora              enable row level security;

-- perfiles: cada usuario ve su perfil; el admin ve todos y gestiona roles.
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select using (user_id = auth.uid() or public.fn_es_admin());

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update using (public.fn_es_admin()) with check (public.fn_es_admin());

-- productos: consultar y crear = ambos roles; editar y eliminar = solo admin.
drop policy if exists productos_select on public.productos;
create policy productos_select on public.productos
  for select using (auth.uid() is not null);

drop policy if exists productos_insert on public.productos;
create policy productos_insert on public.productos
  for insert with check (auth.uid() is not null);

drop policy if exists productos_update on public.productos;
create policy productos_update on public.productos
  for update using (public.fn_es_admin()) with check (public.fn_es_admin());

drop policy if exists productos_delete on public.productos;
create policy productos_delete on public.productos
  for delete using (public.fn_es_admin());

-- proveedores: misma matriz que productos.
drop policy if exists proveedores_select on public.proveedores;
create policy proveedores_select on public.proveedores
  for select using (auth.uid() is not null);

drop policy if exists proveedores_insert on public.proveedores;
create policy proveedores_insert on public.proveedores
  for insert with check (auth.uid() is not null);

drop policy if exists proveedores_update on public.proveedores;
create policy proveedores_update on public.proveedores
  for update using (public.fn_es_admin()) with check (public.fn_es_admin());

drop policy if exists proveedores_delete on public.proveedores;
create policy proveedores_delete on public.proveedores
  for delete using (public.fn_es_admin());

-- ventas: el empleado solo ve y registra sus propias ventas; el admin ve todo.
-- Nadie puede modificar o anular ventas desde la app (ni el admin por API).
drop policy if exists ventas_select on public.ventas;
create policy ventas_select on public.ventas
  for select using (public.fn_es_admin() or id_usuario = auth.uid());

drop policy if exists ventas_insert on public.ventas;
create policy ventas_insert on public.ventas
  for insert with check (id_usuario = auth.uid());

-- venta_items: visible junto con la venta a la que pertenece.
drop policy if exists venta_items_select on public.venta_items;
create policy venta_items_select on public.venta_items
  for select using (
    exists (
      select 1 from public.ventas v
      where v.id_venta = venta_items.id_venta
        and (public.fn_es_admin() or v.id_usuario = auth.uid())
    )
  );

-- movimientos de inventario: consultar y registrar = ambos roles; inmutables.
drop policy if exists movimientos_select on public.movimientos_inventario;
create policy movimientos_select on public.movimientos_inventario
  for select using (auth.uid() is not null);

drop policy if exists movimientos_insert on public.movimientos_inventario;
create policy movimientos_insert on public.movimientos_inventario
  for insert with check (id_usuario = auth.uid());

-- compras y bitácora: solo el administrador.
drop policy if exists compras_select on public.compras;
create policy compras_select on public.compras
  for select using (public.fn_es_admin());

drop policy if exists bitacora_select on public.bitacora;
create policy bitacora_select on public.bitacora
  for select using (public.fn_es_admin());

-- ----------------------------------------------------------------------------
-- Datos de ejemplo (solo si las tablas están vacías).
-- ----------------------------------------------------------------------------
insert into public.proveedores (nombre, telefono, correo, direccion)
select * from (values
  ('Distribuidora MediFarma', '6017894512', 'ventas@medifarma.com', 'Cra 10 # 20-30, Bogotá'),
  ('Laboratorios San Rafael', '6017123456', 'contacto@sanrafael.com', 'Calle 45 # 12-05, Medellín')
) as nuevos(nombre, telefono, correo, direccion)
where not exists (select 1 from public.proveedores);

insert into public.productos (codigo, nombre, categoria, precio, cantidad, fecha_vencimiento, id_proveedor)
select * from (values
  ('MED-001', 'Acetaminofén 500mg x20', 'Analgésicos', 8500::numeric, 120, current_date + 220, 1::bigint),
  ('MED-002', 'Ibuprofeno 400mg x10', 'Analgésicos', 7200::numeric, 8, current_date + 15, 1::bigint),
  ('MED-003', 'Amoxicilina 500mg x12', 'Antibióticos', 15900::numeric, 45, current_date + 180, 2::bigint),
  ('MED-004', 'Loratadina 10mg x10', 'Antigripales', 6300::numeric, 60, current_date + 300, 2::bigint),
  ('MED-005', 'Vitamina C 1g x10 efervescente', 'Vitaminas y suplementos', 12800::numeric, 5, current_date + 25, 1::bigint),
  ('MED-006', 'Alcohol antiséptico 350ml', 'Cuidado personal', 9500::numeric, 0, current_date + 400, 2::bigint),
  ('MED-007', 'Crema hidratante corporal 200ml', 'Dermatológicos', 21000::numeric, 30, current_date + 500, 1::bigint)
) as nuevos(codigo, nombre, categoria, precio, cantidad, fecha_vencimiento, id_proveedor)
where not exists (select 1 from public.productos);

insert into public.compras (fecha, id_proveedor, total)
select * from (values
  (current_date - 10, 1::bigint, 450000::numeric),
  (current_date - 5, 2::bigint, 210000::numeric)
) as nuevas(fecha, id_proveedor, total)
where not exists (select 1 from public.compras);
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
