import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapProveedor } from "@/lib/helpers";

/** PUT /api/proveedores/[id] — editar proveedor. Solo administrador. */
export async function PUT(request, { params }) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede editar proveedores." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cambios = {};
  if (body.nombre !== undefined) cambios.nombre = String(body.nombre).trim();
  if (body.telefono !== undefined) cambios.telefono = String(body.telefono).trim();
  if (body.correo !== undefined) cambios.correo = body.correo || null;
  if (body.direccion !== undefined) cambios.direccion = body.direccion || null;

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .update(cambios)
    .eq("id_proveedor", Number(params.id))
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el proveedor." }, { status: 400 });
  }
  return NextResponse.json(mapProveedor(data));
}

/** DELETE /api/proveedores/[id] — eliminar proveedor. Solo administrador. */
export async function DELETE(request, { params }) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar proveedores." }, { status: 403 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("proveedores").delete().eq("id_proveedor", Number(params.id));

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar el proveedor." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
