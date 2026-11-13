import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el servidor (route handlers y componentes de
 * servidor). La sesión viaja en cookies httpOnly gestionadas por
 * @supabase/ssr, por lo que el navegador nunca guarda la sesión en
 * localStorage y no se puede fabricar manualmente.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llama desde un Server Component: el middleware ya
            // refresca las cookies, se ignora de forma segura.
          }
        },
      },
    }
  );
}

/**
 * Devuelve la sesión verificada en servidor: usuario autenticado y su perfil
 * con el rol asignado. Si el usuario no existe o no tiene perfil, devuelve
 * null (sin acceso).
 */
export async function getSesion() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("user_id, nombre, rol")
    .eq("user_id", user.id)
    .single();

  if (!perfil) return null;

  return { user, perfil };
}
