"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Página de entrada: el middleware verifica la sesión en el servidor y
 * redirige a /login (sin sesión) o al inicio del rol (panel para admin,
 * ventas para empleado). Aquí solo se muestra un estado de carga.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/sesion", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((sesion) => {
        router.replace(sesion ? (sesion.rol === "admin" ? "/dashboard" : "/ventas") : "/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-crema-100">
      <p className="text-bosque-500 font-display text-lg">Cargando Solo la Salud…</p>
    </div>
  );
}
