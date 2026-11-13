"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { notificarAlertas } from "@/lib/eventos";
import { diasParaVencer, UMBRAL_BAJO_STOCK, UMBRAL_DIAS_VENCIMIENTO } from "@/lib/helpers";

const TABS = [
  { key: "todo", label: "Todo el inventario" },
  { key: "bajo", label: "Bajo stock" },
  { key: "agotado", label: "Agotados" },
  { key: "vencer", label: "Próximos a vencer" },
  { key: "movimientos", label: "Entradas y salidas" },
];

/**
 * Inventario.
 * - Admin y empleado consultan la disponibilidad y registran entradas.
 * - La entrada se procesa en el servidor (función registrar_entrada de
 *   PostgreSQL) de forma transaccional y queda en la bitácora.
 */
function InventarioContenido() {
  const searchParams = useSearchParams();
  const destacadoId = searchParams.get("producto") ? Number(searchParams.get("producto")) : null;

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tab, setTab] = useState("todo");
  const [entradaId, setEntradaId] = useState("");
  const [entradaCantidad, setEntradaCantidad] = useState("");
  const [error, setError] = useState("");

  function recargar() {
    fetch("/api/inventario")
      .then((r) => r.json())
      .then((data) => {
        setProductos(data.productos || []);
        setMovimientos(data.movimientos || []);
      })
      .catch(() => setError("No se pudo cargar el inventario."));
  }

  useEffect(() => {
    recargar();
  }, []);

  useEffect(() => {
    if (destacadoId) {
      setTab("todo");
      const fila = document.getElementById(`producto-${destacadoId}`);
      if (fila) fila.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [destacadoId, productos]);

  const lista = useMemo(() => {
    if (tab === "bajo") return productos.filter((p) => p.cantidad > 0 && p.cantidad <= UMBRAL_BAJO_STOCK);
    if (tab === "agotado") return productos.filter((p) => p.cantidad === 0);
    if (tab === "vencer")
      return productos.filter((p) => {
        const dias = diasParaVencer(p.fechaVencimiento);
        return dias >= 0 && dias <= UMBRAL_DIAS_VENCIMIENTO;
      });
    return productos;
  }, [productos, tab]);

  async function handleEntrada(e) {
    e.preventDefault();
    if (!entradaId || !entradaCantidad || Number(entradaCantidad) <= 0) return;
    setError("");
    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idProducto: Number(entradaId), cantidad: Number(entradaCantidad) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la entrada.");
      notificarAlertas(data.alertas || []);
      setEntradaId("");
      setEntradaCantidad("");
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-bosque-700">Inventario</h1>
        <p className="text-sm text-bosque-500 mt-1">Consulta la disponibilidad y registra entradas de mercancía.</p>
      </header>

      <div className="flex gap-2 flex-wrap mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
              tab === t.key ? "bg-bosque-500 text-crema-50 border-bosque-500" : "border-crema-200 text-bosque-600 hover:bg-crema-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "movimientos" ? (
        <div className="grid md:grid-cols-3 gap-5">
          <form onSubmit={handleEntrada} className="card p-5 h-fit">
            <h2 className="font-display text-base font-semibold text-bosque-700 mb-3">Registrar entrada</h2>
            <label className="block text-xs font-medium text-bosque-700 mb-1">Producto</label>
            <select className="input-field mb-3" value={entradaId} onChange={(e) => setEntradaId(e.target.value)}>
              <option value="">Selecciona…</option>
              {productos.map((p) => (
                <option key={p.idProducto} value={p.idProducto}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-bosque-700 mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              className="input-field mb-4"
              value={entradaCantidad}
              onChange={(e) => setEntradaCantidad(e.target.value)}
            />
            {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <button className="btn-primary w-full" type="submit">
              Registrar entrada
            </button>
          </form>

          <div className="card overflow-x-auto md:col-span-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.idInventario} className="border-b border-crema-200 last:border-0">
                    <td className="px-4 py-3 text-bosque-500">{m.fecha}</td>
                    <td className="px-4 py-3 font-medium text-bosque-700">{m.nombreProducto}</td>
                    <td className="px-4 py-3">
                      {m.tipo === "entrada" ? (
                        <span className="badge badge-ok">Entrada</span>
                      ) : (
                        <span className="badge badge-warn">Salida</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{m.cantidad}</td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-bosque-500 text-sm">
                      Aún no hay movimientos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr
                  key={p.idProducto}
                  id={`producto-${p.idProducto}`}
                  className={`border-b border-crema-200 last:border-0 ${
                    p.idProducto === destacadoId ? "bg-bosque-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-bosque-500">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                  <td className="px-4 py-3">{p.categoria}</td>
                  <td className="px-4 py-3">{p.cantidad}</td>
                  <td className="px-4 py-3">
                    {p.fechaVencimiento}{" "}
                    <span className="text-xs text-bosque-500/80">({diasParaVencer(p.fechaVencimiento)} días)</span>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-bosque-500 text-sm">
                    No hay productos en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InventarioPage() {
  return (
    <Suspense fallback={null}>
      <InventarioContenido />
    </Suspense>
  );
}
