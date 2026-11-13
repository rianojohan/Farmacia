"use client";

import { useEffect, useState } from "react";

function formatoCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

const REPORTES = [
  { key: "ventasDiarias", label: "Ventas diarias" },
  { key: "ventasMensuales", label: "Ventas mensuales" },
  { key: "masVendidos", label: "Productos más vendidos" },
  { key: "inventario", label: "Inventario actual" },
  { key: "vencer", label: "Próximos a vencer" },
  { key: "bajoStock", label: "Bajo stock" },
  { key: "compras", label: "Compras realizadas" },
  { key: "bitacora", label: "Bitácora de auditoría" },
];

const ETIQUETAS_ACCION = {
  venta_registrada: "Venta registrada",
  entrada_inventario: "Entrada de inventario",
  productos_insert: "Producto creado",
  productos_update: "Producto actualizado",
  productos_delete: "Producto eliminado",
  proveedores_insert: "Proveedor creado",
  proveedores_update: "Proveedor actualizado",
  proveedores_delete: "Proveedor eliminado",
};

/**
 * Reportes administrativos (solo administrador; el middleware y la ruta
 * /api/reportes lo aplican también en servidor). Incluye la bitácora de
 * auditoría con el registro de las acciones de todos los usuarios.
 */
export default function ReportesPage() {
  const [reporte, setReporte] = useState("ventasDiarias");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reportes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.error) throw new Error(d.error);
        setDatos(d);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>;
  if (!datos) return <p className="text-bosque-500 font-display">Cargando reportes…</p>;

  const porMes = (() => {
    const acumulado = {};
    datos.ventas.forEach((v) => {
      const mes = v.fecha.slice(0, 7);
      acumulado[mes] = (acumulado[mes] || 0) + v.total;
    });
    return Object.entries(acumulado)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => (a.mes > b.mes ? 1 : -1));
  })();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-bosque-700">Reportes</h1>
        <p className="text-sm text-bosque-500 mt-1">Consulta reportes clave para la toma de decisiones.</p>
      </header>

      <div className="flex gap-2 flex-wrap mb-5">
        {REPORTES.map((r) => (
          <button
            key={r.key}
            onClick={() => setReporte(r.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              reporte === r.key ? "bg-bosque-500 text-crema-50 border-bosque-500" : "border-crema-200 text-bosque-600 hover:bg-crema-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {reporte === "ventasDiarias" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {datos.ventasPorDia.map((d) => (
                <tr key={d.fecha} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{d.fecha}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(d.total)}</td>
                </tr>
              ))}
              {datos.ventasPorDia.length === 0 && <EmptyRow cols={2} />}
            </tbody>
          </table>
        )}

        {reporte === "ventasMensuales" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Mes</th>
                <th className="px-4 py-3 font-medium">Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((m) => (
                <tr key={m.mes} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{m.mes}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(m.total)}</td>
                </tr>
              ))}
              {porMes.length === 0 && <EmptyRow cols={2} />}
            </tbody>
          </table>
        )}

        {reporte === "masVendidos" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Unidades vendidas</th>
                <th className="px-4 py-3 font-medium">Total generado</th>
              </tr>
            </thead>
            <tbody>
              {datos.masVendidos.map((m) => (
                <tr key={m.idProducto} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-bosque-700">{m.nombre}</td>
                  <td className="px-4 py-3">{m.cantidad}</td>
                  <td className="px-4 py-3">{formatoCOP(m.total)}</td>
                </tr>
              ))}
              {datos.masVendidos.length === 0 && <EmptyRow cols={3} />}
            </tbody>
          </table>
        )}

        {reporte === "inventario" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {datos.productos.map((p) => (
                <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                  <td className="px-4 py-3">{p.categoria}</td>
                  <td className="px-4 py-3">{p.cantidad}</td>
                </tr>
              ))}
              {datos.productos.length === 0 && <EmptyRow cols={3} />}
            </tbody>
          </table>
        )}

        {reporte === "vencer" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Vencimiento</th>
                <th className="px-4 py-3 font-medium">Días restantes</th>
              </tr>
            </thead>
            <tbody>
              {datos.porVencer.map((p) => (
                <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                  <td className="px-4 py-3">{p.fechaVencimiento}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-danger">
                      {Math.max(0, Math.round((new Date(p.fechaVencimiento) - new Date()) / 86400000))} días
                    </span>
                  </td>
                </tr>
              ))}
              {datos.porVencer.length === 0 && <EmptyRow cols={3} />}
            </tbody>
          </table>
        )}

        {reporte === "bajoStock" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Stock actual</th>
              </tr>
            </thead>
            <tbody>
              {datos.productos
                .filter((p) => p.cantidad <= 10)
                .map((p) => (
                  <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                    <td className="px-4 py-3">
                      {p.cantidad === 0 ? <span className="badge badge-danger">Agotado</span> : <span className="badge badge-warn">{p.cantidad}</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {reporte === "compras" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.compras.map((c) => (
                <tr key={c.idCompra} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{c.fecha}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(c.total)}</td>
                </tr>
              ))}
              {datos.compras.length === 0 && <EmptyRow cols={2} />}
            </tbody>
          </table>
        )}

        {reporte === "bitacora" && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Acción</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {datos.bitacora.map((b) => (
                <tr key={b.id} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{new Date(b.fecha).toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{b.usuario}</td>
                  <td className="px-4 py-3">{ETIQUETAS_ACCION[b.accion] || b.accion}</td>
                  <td className="px-4 py-3 text-bosque-500 max-w-xs truncate">{JSON.stringify(b.detalle)}</td>
                </tr>
              ))}
              {datos.bitacora.length === 0 && <EmptyRow cols={4} />}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-bosque-500 text-sm">
        No hay datos para mostrar todavía.
      </td>
    </tr>
  );
}
