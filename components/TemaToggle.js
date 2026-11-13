"use client";

import { useEffect, useState } from "react";

/**
 * Botón para alternar entre modo claro y oscuro en toda la aplicación.
 * La preferencia se guarda en localStorage ("tema") y la clase "dark" se
 * aplica directamente en <html> para que el cambio sea global e inmediato.
 */
export default function TemaToggle({ className = "" }) {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternarTema() {
    const activar = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", activar);
    try {
      window.localStorage.setItem("tema", activar ? "oscuro" : "claro");
    } catch {
      /* Sin acceso a localStorage simplemente no se recuerda la preferencia. */
    }
    setOscuro(activar);
  }

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className={`shrink-0 flex items-center justify-center rounded-full transition-colors ${className}`}
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
  );
}
