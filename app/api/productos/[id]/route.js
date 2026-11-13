import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapProducto } from "@/lib/helpers";

/**
 * PUT /api/productos/[id] — editar un producto. Solo administrador.
 * Si un empleado envía esta petición (aunque manipule la interfaz o la
 * consola del navegador) recibe 403, y la política RLS lo refrenda.
 */
export async function PUT(request, { params }) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede editar productos." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const cambios = {};
  if (body.codigo !== undefined) cambios.codigo = String(body.codigo).trim();
  if (body.nombre !== undefined) cambios.nombre = String(body.nombre).trim();
  if (body.categoria !== undefined) cambios.categoria = body.categoria;
  if (body.precio !== undefined) cambios.precio = Number(body.precio);
  if (body.cantidad !== undefined) cambios.cantidad = Number(body.cantidad);
  if (body.fechaVencimiento !== undefined) cambios.fecha_vencimiento = body.fechaVencimiento;
  if (body.idProveedor !== undefined) cambios.id_proveedor = body.idProveedor ? Number(body.idProveedor) : null;

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("productos")
    .update(cambios)
    .eq("id_producto", Number(params.id))
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 400 });
  }
  return NextResponse.json(mapProducto(data));
}

/** DELETE /api/productos/[id] — eliminar un producto. Solo administrador. */
export async function DELETE(request, { params }) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar productos." }, { status: 403 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("productos").delete().eq("id_producto", Number(params.id));

  if (error) {
    return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
