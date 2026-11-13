import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import { mapProducto, mapVenta, diasParaVencer, UMBRAL_DIAS_VENCIMIENTO } from "@/lib/helpers";

/**
 * GET /api/reportes — datos para los reportes administrativos, incluida la
 * bitácora de auditoría. Solo administrador: concentra la información
 * financiera y de actividad de toda la droguería.
 */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede ver los reportes." }, { status: 403 });
  }

  const supabase = createClient();
  const [productosRes, ventasRes, comprasRes, bitacoraRes] = await Promise.all([
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("ventas").select("*, venta_items(*)").order("fecha"),
    supabase.from("compras").select("*").order("fecha"),
    supabase
      .from("bitacora")
      .select("id, fecha, accion, detalle, perfiles(nombre)")
      .order("fecha", { ascending: false })
      .limit(100),
  ]);

  if (productosRes.error || ventasRes.error) {
    return NextResponse.json({ error: "No se pudieron cargar los reportes." }, { status: 500 });
  }

  const productos = (productosRes.data || []).map(mapProducto);
  const ventas = (ventasRes.data || []).map(mapVenta);
  const compras = (comprasRes.data || []).map((c) => ({
    idCompra: c.id_compra,
    fecha: c.fecha,
    total: Number(c.total),
  }));

  // Productos más vendidos y ventas por día (cálculo en servidor).
  const conteo = {};
  ventas.forEach((v) =>
    v.items.forEach((it) => {
      if (!conteo[it.idProducto]) {
        conteo[it.idProducto] = { idProducto: it.idProducto, nombre: it.nombre, cantidad: 0, total: 0 };
      }
      conteo[it.idProducto].cantidad += it.cantidad;
      conteo[it.idProducto].total += it.precio * it.cantidad;
    })
  );
  const masVendidos = Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad);

  const porDia = {};
  ventas.forEach((v) => {
    porDia[v.fecha] = (porDia[v.fecha] || 0) + v.total;
  });
  const ventasPorDia = Object.entries(porDia)
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

  const bitacora = (bitacoraRes.data || []).map((b) => ({
    id: b.id,
    fecha: b.fecha,
    usuario: b.perfiles?.nombre || "Sistema",
    accion: b.accion,
    detalle: b.detalle,
  }));

  return NextResponse.json({
    productos,
    ventas,
    compras,
    masVendidos,
    ventasPorDia,
    bitacora,
    porVencer: productos.filter((p) => diasParaVencer(p.fechaVencimiento) <= UMBRAL_DIAS_VENCIMIENTO),
  });
}
