"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificarAlertas } from "@/lib/eventos";
import { diasParaVencer, UMBRAL_DIAS_VENCIMIENTO } from "@/lib/helpers";
import StatCard from "@/components/StatCard";

function formatoCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

/**
 * Panel principal (solo administrador; el middleware redirige a cualquier
 * otro perfil). El resumen se calcula en el servidor con los datos de todas
 * las ventas e inventario.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [resumen, setResumen] = useState(null);

  // --- Buscador central de productos --------------------------------------
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function recargar() {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/productos").then((r) => r.json()),
    ])
      .then(([res, prods]) => {
        if (res && res.error) throw new Error(res.error);
        setResumen(res);
        setProductos(Array.isArray(prods) ? prods : []);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    recargar();
  }, []);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
      .slice(0, 6);
  }, [productos, busqueda]);

  function seleccionarProducto(p) {
    setSeleccionado(p);
    setBusqueda("");
    setCantidadVenta(1);
    setMensaje("");
  }

  function verInventario() {
    if (!seleccionado) return;
    router.push(`/inventario?producto=${seleccionado.idProducto}`);
  }

  async function registrarVenta() {
    if (!seleccionado || seleccionado.cantidad === 0) return;
    setError("");
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ idProducto: seleccionado.idProducto, cantidad: cantidadVenta }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la venta.");
      notificarAlertas(data.alertas || []);
      setMensaje(`Venta registrada: ${cantidadVenta} × ${seleccionado.nombre}.`);
      setSeleccionado(null);
      recargar();
      setTimeout(() => setMensaje(""), 4000);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!resumen) {
    return (
      <div>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <p className="text-bosque-500 font-display">Cargando panel…</p>
      </div>
    );
  }

  const diasVenceSeleccionado = seleccionado ? diasParaVencer(seleccionado.fechaVencimiento) : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-bosque-700">Panel principal</h1>
        <p className="text-sm text-bosque-500 mt-1">
          Busca un producto y consulta su existencia o registra una venta desde el mismo lugar.
        </p>
      </header>

      {/* Buscador central de productos */}
      <div className="card p-5 relative mb-6">
        <label className="block text-xs font-medium text-bosque-700 mb-1">Buscar producto por nombre o código</label>
        <input
          className="input-field max-w-xl"
          placeholder="Ej: acetaminofén o MED-001…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {resultados.length > 0 && (
          <div className="absolute left-5 right-5 mt-1 max-w-xl bg-crema-50 border border-crema-200 rounded-xl shadow-card z-10 overflow-hidden">
            {resultados.map((p) => (
              <button
                key={p.idProducto}
                onClick={() => seleccionarProducto(p)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-crema-100 flex items-center justify-between"
              >
                <span>
                  <span className="font-medium text-bosque-700">{p.nombre}</span>{" "}
                  <span className="text-xs text-bosque-500">({p.codigo})</span>
                </span>
                <span className="text-xs text-bosque-500">{p.cantidad} disp.</span>
              </button>
            ))}
          </div>
        )}

        {mensaje && <p className="text-xs text-bosque-600 bg-bosque-50 rounded-lg px-3 py-2 mt-4">{mensaje}</p>}
        {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</p>}

        {seleccionado && (
          <div className="mt-4 border border-crema-200 rounded-xl p-4 grid md:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-display text-lg font-semibold text-bosque-700">{seleccionado.nombre}</h2>
                <span className="text-xs text-bosque-500">({seleccionado.codigo})</span>
              </div>
              <p className="text-sm text-bosque-500 mb-3">{seleccionado.categoria}</p>

              <div className="grid grid-cols-3 gap-4 max-w-md">
                <div>
                  <p className="text-xs text-bosque-500">Precio</p>
                  <p className="text-sm font-medium text-bosque-700">{formatoCOP(seleccionado.precio)}</p>
                </div>
                <div>
                  <p className="text-xs text-bosque-500">Disponible</p>
                  <p className="text-sm font-medium text-bosque-700">
                    {seleccionado.cantidad === 0 ? (
                      <span className="badge badge-danger">Agotado</span>
                    ) : (
                      seleccionado.cantidad
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-bosque-500">Vencimiento</p>
                  <p className="text-sm font-medium text-bosque-700">
                    {diasVenceSeleccionado >= 0 && diasVenceSeleccionado <= UMBRAL_DIAS_VENCIMIENTO ? (
                      <span className="badge badge-danger">{diasVenceSeleccionado} días</span>
                    ) : (
                      `${diasVenceSeleccionado} días`
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <button className="btn-secondary" onClick={verInventario}>
                  Ver inventario
                </button>
                <input
                  type="number"
                  min="1"
                  max={seleccionado.cantidad}
                  className="input-field w-20"
                  value={cantidadVenta}
                  onChange={(e) => setCantidadVenta(Number(e.target.value))}
                  disabled={seleccionado.cantidad === 0}
                />
                <button className="btn-primary" onClick={registrarVenta} disabled={seleccionado.cantidad === 0}>
                  Registrar venta
                </button>
                <button className="text-xs text-bosque-500 underline underline-offset-2 ml-2" onClick={() => setSeleccionado(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total de productos" value={resumen.totalProductos} />
        <StatCard label="Ventas del día" value={resumen.ventasHoyCount} hint={formatoCOP(resumen.totalVentasHoy)} />
        <StatCard label="Total de ventas" value={formatoCOP(resumen.totalVentas)} />
        <StatCard
          label="Bajo stock"
          value={resumen.bajoStock.length + resumen.agotados.length}
          tone={resumen.bajoStock.length + resumen.agotados.length > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Próximos a vencer"
          value={resumen.porVencer.length}
          tone={resumen.porVencer.length > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-bosque-700">Bajo stock y agotados</h2>
            <Link href="/inventario" className="text-xs text-bosque-500 underline underline-offset-2">
              Ver inventario
            </Link>
          </div>
          {resumen.bajoStock.length === 0 && resumen.agotados.length === 0 ? (
            <p className="text-sm text-bosque-500">No hay productos con bajo stock por el momento.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.agotados.map((p) => (
                <li key={p.idProducto} className="flex items-center justify-between text-sm">
                  <span>{p.nombre}</span>
                  <span className="badge badge-danger">Agotado</span>
                </li>
              ))}
              {resumen.bajoStock.map((p) => (
                <li key={p.idProducto} className="flex items-center justify-between text-sm">
                  <span>{p.nombre}</span>
                  <span className="badge badge-warn">{p.cantidad} unidades</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-bosque-700">Próximos a vencer</h2>
            <Link href="/productos" className="text-xs text-bosque-500 underline underline-offset-2">
              Ver productos
            </Link>
          </div>
          {resumen.porVencer.length === 0 ? (
            <p className="text-sm text-bosque-500">No hay productos próximos a vencer.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.porVencer.map((p) => (
                <li key={p.idProducto} className="flex items-center justify-between text-sm">
                  <span>{p.nombre}</span>
                  <span className="badge badge-danger">{diasParaVencer(p.fechaVencimiento)} días</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
