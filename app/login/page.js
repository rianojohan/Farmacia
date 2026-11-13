"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inicioPorRol } from "@/lib/permisos";

/**
 * Inicio de sesión. La validación de credenciales ocurre en el servidor
 * (/api/auth/login con Supabase Auth); la sesión se guarda en una cookie
 * httpOnly y nunca en localStorage. No se exhiben credenciales de prueba.
 */
export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [oscuro, setOscuro] = useState(false);

  // Recupera la preferencia de tema guardada (solo apariencia, sin datos sensibles).
  useEffect(() => {
    setOscuro(window.localStorage.getItem("tema") === "oscuro");
  }, []);

  function alternarTema() {
    setOscuro((prev) => {
      window.localStorage.setItem("tema", prev ? "claro" : "oscuro");
      return !prev;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!correo || !contrasena) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos.");
        setCargando(false);
        return;
      }
      router.replace(inicioPorRol(data.perfil?.rol));
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div
      className={`${oscuro ? "dark" : ""} min-h-screen flex items-center justify-center bg-crema-100 dark:bg-bosque-900 px-4 relative transition-colors`}
    >
      <button
        type="button"
        onClick={alternarTema}
        aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}
        title={oscuro ? "Modo claro" : "Modo oscuro"}
        className="absolute top-4 right-4 w-10 h-10 rounded-full border border-bosque-200 dark:border-bosque-400 bg-white dark:bg-bosque-700 text-bosque-600 dark:text-crema-100 flex items-center justify-center transition-colors hover:border-bosque-400"
      >
        {oscuro ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-bosque-500 flex items-center justify-center mb-4">
            <span className="text-crema-50 font-display text-2xl">+</span>
          </div>
          <h1 className="font-display text-2xl text-bosque-700 dark:text-crema-100 font-semibold">Solo la Salud</h1>
          <p className="text-sm text-bosque-500 dark:text-bosque-200 mt-1">Sistema de gestión de droguería</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-bosque-700 dark:text-crema-100 mb-1">Usuario (correo)</label>
            <input
              type="email"
              className="input-field"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="nombre@solalasalud.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-bosque-700 dark:text-crema-100 mb-1">Contraseña</label>
            <input
              type="password"
              className="input-field"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={cargando}>
            {cargando ? "Verificando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-5 text-xs text-bosque-500 dark:text-bosque-200 text-center leading-relaxed">
          El acceso es personal e intransferible. Si no tienes cuenta o olvidaste
          tu contraseña, contacta al administrador de la droguería.
        </p>
      </div>
    </div>
  );
}
