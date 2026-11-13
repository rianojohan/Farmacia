import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapVenta, calcularAlertas, mapProducto } from "@/lib/helpers";

/**
 * GET /api/ventas — historial de ventas con sus productos.
 * El empleado solo recibe sus propias ventas; el administrador recibe todas
 * (filtrado aplicado por la política RLS de la base de datos).
 */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("*, venta_items(*)")
    .order("fecha", { ascending: false })
    .order("id_venta", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar las ventas." }, { status: 500 });
  }
  return NextResponse.json(data.map(mapVenta));
}

/**
 * POST /api/ventas — registrar una venta de forma transaccional mediante la
 * función registrar_venta de PostgreSQL: valida existencias, descuenta
 * inventario, guarda el detalle y escribe en la bitácora de auditoría.
 * Permitido para admin y empleado.
 */
export async function POST(request) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "La venta debe incluir al menos un producto." }, { status: 400 });
  }
  if (items.some((it) => !it.idProducto || !Number(it.cantidad) || Number(it.cantidad) <= 0)) {
    return NextResponse.json({ error: "Cada producto necesita una cantidad válida." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: idVenta, error } = await supabase.rpc("registrar_venta", { items });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Alertas de inventario (bajo stock, agotado, por vencer) para la Vista.
  const ids = items.map((it) => Number(it.idProducto));
  const { data: prods } = await supabase.from("productos").select("*").in("id_producto", ids);
  const productos = (prods || []).map(mapProducto);

  return NextResponse.json({ ok: true, idVenta, alertas: calcularAlertas(productos) }, { status: 201 });
}
