import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapMovimiento, mapProducto, calcularAlertas } from "@/lib/helpers";

/**
 * GET /api/inventario — movimientos de inventario (entradas y salidas) junto
 * con el catálogo actual. Requiere sesión (admin y empleado).
 */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient();
  const [{ data: movs, error }, { data: prods }] = await Promise.all([
    supabase
      .from("movimientos_inventario")
      .select("*")
      .order("fecha", { ascending: false })
      .order("id_inventario", { ascending: false }),
    supabase.from("productos").select("*").order("nombre"),
  ]);

  if (error) {
    return NextResponse.json({ error: "No se pudo cargar el inventario." }, { status: 500 });
  }

  const productos = (prods || []).map(mapProducto);
  return NextResponse.json({
    productos,
    movimientos: (movs || []).map((m) => mapMovimiento(m, productos)),
  });
}

/**
 * POST /api/inventario — registrar una entrada de mercancía mediante la
 * función registrar_entrada de PostgreSQL (transaccional y con bitácora).
 * Permitido para admin y empleado.
 */
export async function POST(request) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const idProducto = Number(body.idProducto);
  const cantidad = Number(body.cantidad);
  if (!idProducto || !cantidad || cantidad <= 0) {
    return NextResponse.json({ error: "Selecciona un producto y una cantidad válida." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("registrar_entrada", {
    p_id_producto: idProducto,
    p_cantidad: cantidad,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: prod } = await supabase
    .from("productos")
    .select("*")
    .eq("id_producto", idProducto)
    .single();

  return NextResponse.json(
    { ok: true, cantidad: data, alertas: prod ? calcularAlertas([mapProducto(prod)]) : [] },
    { status: 201 }
  );
}
