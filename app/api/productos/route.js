import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapProducto } from "@/lib/helpers";

/** GET /api/productos — catálogo. Requiere sesión (admin y empleado). */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar los productos." }, { status: 500 });
  }
  return NextResponse.json(data.map(mapProducto));
}

/**
 * POST /api/productos — registrar un producto nuevo.
 * Permitido para admin y empleado (agregar); editar y eliminar quedan en
 * PUT/DELETE de /api/productos/[id], reservados al administrador y
 * refrendados por las políticas RLS de la base de datos.
 */
export async function POST(request) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const errores = validarProducto(body);
  if (errores) return NextResponse.json({ error: errores }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({
      codigo: body.codigo.trim(),
      nombre: body.nombre.trim(),
      categoria: body.categoria,
      precio: Number(body.precio),
      cantidad: Number(body.cantidad || 0),
      fecha_vencimiento: body.fechaVencimiento,
      id_proveedor: body.idProveedor ? Number(body.idProveedor) : null,
    })
    .select()
    .single();

  if (error) {
    const mensaje =
      error.code === "23505" ? "Ya existe un producto con ese código." : "No se pudo registrar el producto.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
  return NextResponse.json(mapProducto(data), { status: 201 });
}

function validarProducto(b) {
  if (!b.codigo || !b.codigo.trim()) return "El código es obligatorio.";
  if (!b.nombre || !b.nombre.trim()) return "El nombre es obligatorio.";
  if (!b.categoria) return "La categoría es obligatoria.";
  if (b.precio === "" || b.precio === null || Number(b.precio) < 0) return "El precio debe ser un valor válido.";
  if (b.cantidad !== "" && b.cantidad !== null && Number(b.cantidad) < 0) return "La cantidad no puede ser negativa.";
  if (!b.fechaVencimiento) return "La fecha de vencimiento es obligatoria.";
  return null;
}
