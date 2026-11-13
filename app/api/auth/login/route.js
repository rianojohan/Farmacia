import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Inicio de sesión validado en el servidor con Supabase Auth.
 * Las contraseñas ya no se comparan ni se guardan en el navegador:
 * la verificación ocurre aquí y la sesión queda en una cookie httpOnly.
 */
export async function POST(request) {
  const { correo, contrasena } = await request.json().catch(() => ({}));

  if (!correo || !contrasena) {
    return NextResponse.json({ error: "Ingresa tu usuario y contraseña." }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  // El acceso requiere un perfil con rol asignado en la base de datos.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("user_id", data.user.id)
    .single();

  if (!perfil) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Tu usuario no tiene acceso al sistema. Contacta al administrador." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, perfil });
}
