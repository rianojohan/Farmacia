import { NextResponse } from "next/server";
import { getSesion } from "@/lib/supabase/server";

/**
 * Devuelve la sesión verificada en servidor: usuario autenticado y su rol.
 * La interfaz usa esta ruta para saber qué mostrar, pero los permisos reales
 * se aplican aquí, en las demás rutas de API y en las políticas RLS.
 */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({
    idUsuario: sesion.user.id,
    correo: sesion.user.email,
    nombre: sesion.perfil.nombre,
    rol: sesion.perfil.rol,
  });
}
