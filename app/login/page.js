"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("admin@solalasalud.com");
  const [contrasena, setContrasena] = useState("admin123");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!correo || !contrasena) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }
    const sesion = login(correo, contrasena);
    if (!sesion) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-crema-100 px-4">
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
            />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full">
            Iniciar sesión
          </button>
        </form>

        <div className="mt-5 text-xs text-bosque-500 bg-bosque-50 rounded-xl p-3 leading-relaxed">
          <p className="font-medium text-bosque-700 mb-1">Usuarios de prueba</p>
          <p>Administrador: admin@solalasalud.com / admin123</p>
          <p>Empleado: empleado@solalasalud.com / empleado123</p>
        </div>
      </div>
    </div>
  );
}
