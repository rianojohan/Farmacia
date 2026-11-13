import { NextResponse } from "next/server";
import { createClient, getSesion } from "@/lib/supabase/server";

async function gestionar(body) {
  const sesion = await getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (sesion.perfil.rol !== "admin") return NextResponse.json({ error: "Acceso exclusivo para administradores." }, { status: 403 });

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("gestion-usuarios", { body });
  if (error) {
    const result = await error.context?.json?.().catch(() => null);
    return NextResponse.json({ error: result?.error || "No se pudo conectar con la gestión de usuarios." }, { status: error.context?.status || 502 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return gestionar({ accion: "listar" });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (origin && new URL(origin).host !== host) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Origen no válido." }, { status: 403 });
  }
  return gestionar(await request.json().catch(() => ({})));
}
