import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";
import {
  mapProducto,
  diasParaVencer,
  UMBRAL_BAJO_STOCK,
  UMBRAL_DIAS_VENCIMIENTO,
} from "@/lib/helpers";

/**
 * GET /api/dashboard — resumen del panel principal. Solo administrador:
 * contiene métricas globales de ventas e inventario que el perfil de
 * empleado no debe consultar.
 */
export async function GET() {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sesion.perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede ver el panel." }, { status: 403 });
  }

  const supabase = createClient();
  const { data: productos, error } = await supabase.from("productos").select("*");
  if (error) {
    return NextResponse.json({ error: "No se pudo cargar el resumen." }, { status: 500 });
  }

  const { data: ventas } = await supabase.from("ventas").select("fecha, total");
  const hoy = new Date().toISOString().slice(0, 10);
  const lista = (productos || []).map(mapProducto);
  const todas = (ventas || []).map((v) => ({ fecha: v.fecha, total: Number(v.total) }));
  const ventasHoy = todas.filter((v) => v.fecha === hoy);

  return NextResponse.json({
    totalProductos: lista.length,
    ventasHoyCount: ventasHoy.length,
    totalVentasHoy: ventasHoy.reduce((s, v) => s + v.total, 0),
    totalVentas: todas.reduce((s, v) => s + v.total, 0),
    bajoStock: lista.filter((p) => p.cantidad > 0 && p.cantidad <= UMBRAL_BAJO_STOCK),
    agotados: lista.filter((p) => p.cantidad === 0),
    porVencer: lista.filter((p) => {
      const dias = diasParaVencer(p.fechaVencimiento);
      return dias >= 0 && dias <= UMBRAL_DIAS_VENCIMIENTO;
    }),
  });
}
