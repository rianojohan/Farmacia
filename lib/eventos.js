"use client";

/**
 * Patrón Observer (lado cliente): emisor minimalista de alertas de inventario.
 *
 * Las rutas de API calculan las alertas en el servidor después de cada venta
 * o entrada y las devuelven en la respuesta; la Vista llama a `notificar`
 * y components/AlertObserver.js, suscrito con `suscribirAlertas`, las muestra
 * como notificaciones flotantes.
 */
const suscriptores = new Set();

export function suscribirAlertas(callback) {
  suscriptores.add(callback);
  return () => suscriptores.delete(callback);
}

export function notificarAlertas(alertas = []) {
  alertas.forEach((alerta) => {
    suscriptores.forEach((callback) => callback(alerta));
  });
}
