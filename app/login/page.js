"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inicioPorRol } from "@/lib/permisos";
import TemaToggle from "@/components/TemaToggle";

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
    <div className="min-h-screen flex items-center justify-center bg-crema-100 px-4 relative transition-colors">
      <TemaToggle className="absolute top-4 right-4 w-10 h-10 border border-bosque-200 bg-crema-50 text-bosque-600 hover:border-bosque-400" />

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-bosque-500 flex items-center justify-center mb-4">
            <span className="text-crema-50 font-display text-2xl">+</span>
          </div>
          <h1 className="font-display text-2xl text-bosque-700 font-semibold">Solo la Salud</h1>
          <p className="text-sm text-bosque-500 mt-1">Sistema de gestión de droguería</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-bosque-700 mb-1">Usuario (correo)</label>
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
            <label className="block text-xs font-medium text-bosque-700 mb-1">Contraseña</label>
            <input
              type="password"
              className="input-field"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={cargando}>
            {cargando ? "Verificando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-5 text-xs text-bosque-500 text-center leading-relaxed">
          El acceso es personal e intransferible. Si no tienes cuenta o olvidaste
          tu contraseña, contacta al administrador de la droguería.
        </p>
      </div>
    </div>
  );
}
