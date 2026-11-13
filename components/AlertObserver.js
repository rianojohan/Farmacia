"use client";

import { useEffect, useState } from "react";
import { suscribirAlertas } from "@/lib/eventos";

/**
 * AlertObserver — implementación en la Vista del patrón Observer.
 *
 * Se suscribe al emisor de alertas (lib/eventos.js). Tras cada venta o
 * entrada, el servidor calcula las alertas de inventario (bajo stock,
 * agotado o próximo a vencer) y la página que realizó la operación las
 * notifica aquí para mostrarlas como notificaciones flotantes.
 */
const ESTILOS = {
  agotado: "badge-danger",
  "bajo-stock": "badge-warn",
  "por-vencer": "badge-danger",
};

const TITULOS = {
  agotado: "Producto agotado",
  "bajo-stock": "Bajo stock",
  "por-vencer": "Próximo a vencer",
};

export default function AlertObserver() {
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    const cancelar = suscribirAlertas((alerta) => {
      const id = `${alerta.tipo}-${alerta.producto.idProducto}-${Date.now()}`;
      setAlertas((prev) => {
        const yaExiste = prev.some(
          (a) => a.tipo === alerta.tipo && a.producto.idProducto === alerta.producto.idProducto
        );
        if (yaExiste) return prev;
        return [...prev, { ...alerta, id }];
      });
      setTimeout(() => {
        setAlertas((prev) => prev.filter((a) => a.id !== id));
      }, 6000);
    });
    return cancelar;
  }, []);

  function cerrar(id) {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  }

  if (alertas.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs">
      {alertas.map((a) => (
        <div key={a.id} className="card p-3 shadow-card border-l-4 border-l-terracota-500">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`badge ${ESTILOS[a.tipo] || "badge-warn"} mb-1`}>{TITULOS[a.tipo] || "Alerta"}</span>
              <p className="text-sm text-bosque-700">{a.mensaje}</p>
            </div>
            <button
              onClick={() => cerrar(a.id)}
              aria-label="Cerrar alerta"
              className="text-bosque-500/70 hover:text-bosque-700 text-sm leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
