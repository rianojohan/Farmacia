"use client";

import { useEffect, useState } from "react";
import {
  listProductos,
  listVentas,
  listCompras,
  productosMasVendidos,
  ventasPorDia,
  diasParaVencer,
  UMBRAL_BAJO_STOCK,
  UMBRAL_DIAS_VENCIMIENTO,
} from "@/lib/db";

function formatoCOP(valor) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

const REPORTES = [
  { key: "ventasDiarias", label: "Ventas diarias" },
  { key: "ventasMensuales", label: "Ventas mensuales" },
  { key: "masVendidos", label: "Productos más vendidos" },
  { key: "inventario", label: "Inventario actual" },
  { key: "vencer", label: "Próximos a vencer" },
  { key: "bajoStock", label: "Bajo stock" },
  { key: "compras", label: "Compras realizadas" },
];

export default function ReportesPage() {
  const [reporte, setReporte] = useState("ventasDiarias");
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    setProductos(listProductos());
    setVentas(listVentas());
    setCompras(listCompras());
  }, []);

  const porDia = ventasPorDia();
  const masVendidos = productosMasVendidos();

  const porMes = (() => {
    const acumulado = {};
    ventas.forEach((v) => {
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
              {porDia.map((d) => (
                <tr key={d.fecha} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{d.fecha}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(d.total)}</td>
                </tr>
              ))}
              {porDia.length === 0 && <EmptyRow cols={2} />}
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
              {masVendidos.map((m) => (
                <tr key={m.idProducto} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-bosque-700">{m.nombre}</td>
                  <td className="px-4 py-3">{m.cantidad}</td>
                  <td className="px-4 py-3">{formatoCOP(m.total)}</td>
                </tr>
              ))}
              {masVendidos.length === 0 && <EmptyRow cols={3} />}
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
              {productos.map((p) => (
                <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                  <td className="px-4 py-3">{p.categoria}</td>
                  <td className="px-4 py-3">{p.cantidad}</td>
                </tr>
              ))}
              {productos.length === 0 && <EmptyRow cols={3} />}
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
              {productos
                .filter((p) => diasParaVencer(p.fechaVencimiento) <= UMBRAL_DIAS_VENCIMIENTO)
                .map((p) => (
                  <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                    <td className="px-4 py-3">{p.fechaVencimiento}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-danger">{diasParaVencer(p.fechaVencimiento)} días</span>
                    </td>
                  </tr>
                ))}
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
              {productos
                .filter((p) => p.cantidad <= UMBRAL_BAJO_STOCK)
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
              {compras.map((c) => (
                <tr key={c.idCompra} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{c.fecha}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(c.total)}</td>
                </tr>
              ))}
              {compras.length === 0 && <EmptyRow cols={2} />}
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
