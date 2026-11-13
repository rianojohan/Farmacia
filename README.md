# Solo la Salud — Sistema de gestión de droguería

Versión corregida según la auditoría de seguridad (Actividad 4 — Arquitectura
de seguridad). Los cambios atienden los riesgos R1–R6 del informe:

- **R1 (credenciales expuestas):** se eliminaron los usuarios de prueba
  publicados en la pantalla de acceso. Las cuentas se administran en Supabase
  Auth y cada usuario debe recibir sus credenciales por un canal privado.
- **R2 (sesión fabricada):** la sesión se valida en el servidor con una cookie
  httpOnly firmada por Supabase Auth. Crear datos de sesión a mano en el
  navegador ya no permite entrar al panel.
- **R3 (contraseñas en localStorage):** ya no se guardan contraseñas ni datos
  de usuarios en el navegador. La información vive en PostgreSQL (Supabase).
- **R4 (permisos por roles):** la matriz de permisos se aplica en tres capas:
  la interfaz, las rutas de API y las políticas RLS de la base de datos.
- **R5 (intentos de acceso):** la autenticación la gestiona Supabase Auth,
  que rechaza contraseñas incorrectas; se recomienda revisar en el proyecto
  de Supabase las opciones de límite de intentos y MFA disponible.
- **R6 (registros y respaldo):** toda operación relevante queda en la tabla
  `bitacora` (visible en Reportes → Bitácora, solo admin) y el respaldo se
  administra desde Supabase (backups automáticos en planes de pago / dumps
  con `pg_dump`).

## Matriz de permisos

| Acción                        | Administrador | Empleado |
| ----------------------------- | :-----------: | :------: |
| Consultar productos/inventario |      ✔       |    ✔     |
| Registrar productos            |      ✔       |    ✔     |
| Editar productos               |      ✔       |    ✖     |
| Eliminar productos             |      ✔       |    ✖     |
| Registrar proveedores          |      ✔       |    ✔     |
| Editar / eliminar proveedores  |      ✔       |    ✖     |
| Registrar entradas de inventario |    ✔       |    ✔     |
| Registrar ventas               |      ✔       |    ✔     |
| Ver todas las ventas           |      ✔       | solo las suyas |
| Panel principal y reportes     |      ✔       |    ✖     |
| Ver bitácora de auditoría      |      ✔       |    ✖     |
| Gestionar usuarios y perfiles  |      ✔       |    ✖     |

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) (plan gratuito).
2. En el editor SQL del proyecto ejecuta el contenido de `supabase/schema.sql`
   (crea tablas, funciones, disparadores de auditoría y políticas RLS).
3. Crea los usuarios en **Authentication → Users** (email y contraseña).
   Todo usuario nuevo nace con rol `empleado`. Para promover a administrador:

   ```sql
   update public.perfiles
   set rol = 'admin'
   where user_id = (select id from auth.users where email = 'correo@empresa.com');
   ```

4. Copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL`
   y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API del proyecto).
5. Despliega la función de Supabase `gestion-usuarios` desde `supabase/functions/gestion-usuarios`, con verificación JWT habilitada. La función usa la clave de servicio disponible en el entorno de Supabase, nunca en el navegador ni en la aplicación Next.js. Para una instalación existente, aplica también la migración `supabase/migrations/gestion_usuarios_historial.sql`.
6. `npm install` y `npm run dev` (o despliega en Vercel configurando las dos
   variables de entorno).

## Notas de seguridad

- Las claves usadas en el navegador (`anon`) son públicas por diseño: el
  acceso a los datos lo controlan las políticas RLS, no el secreto de la clave.
- No subas `.env.local` al repositorio (ya está en `.gitignore`).
- Ventas y entradas se procesan con funciones transaccionales de PostgreSQL
  (`registrar_venta`, `registrar_entrada`) que validan existencias y evitan
  inconsistencias de inventario.
