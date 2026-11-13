import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Cierre de sesión: elimina la cookie de sesión en el servidor. */
export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
