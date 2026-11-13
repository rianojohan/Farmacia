"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el navegador. Solo usa variables públicas
 * (URL y clave anon); los permisos reales se aplican en el servidor y en las
 * políticas RLS de la base de datos.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
