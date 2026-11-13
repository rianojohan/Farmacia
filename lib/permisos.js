/**
 * Matriz de permisos por rol.
 *
 * admin:    acceso total (panel, reportes, crear, editar y eliminar).
 * empleado: solo consultar, crear registros y vender; nunca edita ni elimina,
 *           y no accede al panel ni a los reportes.
 *
 * Estas reglas se reflejan en la interfaz, en las rutas de API y —como capa
 * final— en las políticas RLS de la base de datos (supabase/schema.sql).
 */
export const RUTAS_POR_ROL = {
  admin: ["/dashboard", "/productos", "/inventario", "/ventas", "/proveedores", "/reportes", "/usuarios"],
  empleado: ["/productos", "/inventario", "/ventas", "/proveedores"],
};

export function rutaPermitida(rol, path) {
  const rutas = RUTAS_POR_ROL[rol] || [];
  return rutas.some((r) => path === r || path.startsWith(`${r}/`));
}

export function puedeEditar(rol) {
  return rol === "admin";
}

export function puedeEliminar(rol) {
  return rol === "admin";
}

export function inicioPorRol(rol) {
  return rol === "admin" ? "/dashboard" : "/ventas";
}
