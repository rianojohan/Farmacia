import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapProveedor } from "@/lib/helpers";

/** GET /api/proveedores — listado. Requiere sesión (admin y empleado). */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar los proveedores." }, { status: 500 });
  }
  return NextResponse.json(data.map(mapProveedor));
}

/** POST /api/proveedores — registrar proveedor. Permitido para ambos roles. */
export async function POST(request) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.nombre || !String(body.nombre).trim() || !body.telefono) {
    return NextResponse.json({ error: "Completa al menos el nombre y el teléfono." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: String(body.nombre).trim(),
      telefono: String(body.telefono).trim(),
      correo: body.correo || null,
      direccion: body.direccion || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "No se pudo registrar el proveedor." }, { status: 400 });
  }
  return NextResponse.json(mapProveedor(data), { status: 201 });
}
