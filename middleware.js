import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rutaPermitida, inicioPorRol } from "@/lib/permisos";

/**
 * Middleware de seguridad:
 * 1. Verifica la sesión en el servidor en cada petición (cookie httpOnly);
 *    una sesión fabricada manualmente en el navegador no sirve.
 * 2. Redirige a /login a cualquier visitante sin sesión.
 * 3. Aplica la matriz de rutas por rol: el empleado nunca llega al panel
 *    principal ni a los reportes, aunque escriba la URL a mano.
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname === "/login") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Usuario autenticado: consultar su rol verificado en la base de datos.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("user_id", user.id)
    .single();

  const rol = perfil?.rol || "empleado";
  const inicio = inicioPorRol(rol);

  if (pathname === "/login" || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = inicio;
    return NextResponse.redirect(url);
  }

  if (!rutaPermitida(rol, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = inicio;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
