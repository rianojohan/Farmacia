/**
 * Utilidades compartidas entre cliente y servidor.
 */

export const CATEGORIAS = [
  "Analgésicos",
  "Antibióticos",
  "Antigripales",
  "Vitaminas y suplementos",
  "Cuidado personal",
  "Dermatológicos",
  "Otros",
];

export const UMBRAL_BAJO_STOCK = 10;
export const UMBRAL_DIAS_VENCIMIENTO = 30;

export function diasParaVencer(fechaVencimiento) {
  const hoy = new Date();
  const fecha = new Date(fechaVencimiento);
  const diffMs = fecha.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evalúa los productos indicados y genera las alertas de inventario
 * (agotado, bajo stock, próximo a vencer). Se usa en el servidor tras cada
 * venta o entrada, y el resultado se notifica en el cliente mediante el
 * patrón Observer (lib/eventos.js + components/AlertObserver.js).
 */
export function calcularAlertas(productos) {
  const alertas = [];
  productos.forEach((p) => {
    if (p.cantidad === 0) {
      alertas.push({ tipo: "agotado", producto: p, mensaje: `${p.nombre} se agotó.` });
    } else if (p.cantidad <= UMBRAL_BAJO_STOCK) {
      alertas.push({
        tipo: "bajo-stock",
        producto: p,
        mensaje: `${p.nombre} tiene bajo stock (${p.cantidad} unidades).`,
      });
    }
    const dias = diasParaVencer(p.fechaVencimiento);
    if (dias >= 0 && dias <= UMBRAL_DIAS_VENCIMIENTO) {
      alertas.push({
        tipo: "por-vencer",
        producto: p,
        mensaje: `${p.nombre} vence en ${dias} día${dias === 1 ? "" : "s"}.`,
      });
    }
  });
  return alertas;
}

/* ----------------------- Mapeo filas DB -> aplicación -------------------- */

export function mapProducto(row) {
  return {
    idProducto: row.id_producto,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    precio: Number(row.precio),
    cantidad: row.cantidad,
    fechaVencimiento: row.fecha_vencimiento,
    idProveedor: row.id_proveedor,
  };
}

export function mapProveedor(row) {
  return {
    idProveedor: row.id_proveedor,
    nombre: row.nombre,
    telefono: row.telefono,
    correo: row.correo,
    direccion: row.direccion,
  };
}

export function mapVenta(row) {
  return {
    idVenta: row.id_venta,
    fecha: row.fecha,
    idUsuario: row.id_usuario,
    total: Number(row.total),
    items: (row.venta_items || []).map((it) => ({
      idProducto: it.id_producto,
      nombre: it.nombre,
      cantidad: it.cantidad,
      precio: Number(it.precio),
    })),
  };
}

export function mapMovimiento(row, productos = []) {
  const producto = productos.find((p) => p.idProducto === row.id_producto);
  return {
    idInventario: row.id_inventario,
    idProducto: row.id_producto,
    tipo: row.tipo,
    cantidad: row.cantidad,
    fecha: row.fecha,
    nombreProducto: producto?.nombre || "—",
  };
}
