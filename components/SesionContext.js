"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const SesionContext = createContext(null);

/**
 * Provee la sesión verificada en servidor (usuario, nombre y rol) a toda la
 * aplicación. La interfaz solo usa esta información para decidir qué
 * mostrar; la validación real ocurre en las rutas de API y en las políticas
 * RLS de la base de datos.
 */
export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(undefined);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sesion", { cache: "no-store" });
      setSesion(res.ok ? await res.json() : null);
    } catch {
      setSesion(null);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}
