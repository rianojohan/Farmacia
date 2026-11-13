"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSesion } from "@/components/SesionContext";
import { notificarAlertas } from "@/lib/eventos";
import { puedeEditar, puedeEliminar } from "@/lib/permisos";
import { CATEGORIAS, diasParaVencer, UMBRAL_BAJO_STOCK, UMBRAL_DIAS_VENCIMIENTO } from "@/lib/helpers";

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
  const sesion = useSesion();
  const editar = puedeEditar(sesion?.rol);
  const eliminar = puedeEliminar(sesion?.rol);

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [tab, setTab] = useState("todo");
  const [entradaId, setEntradaId] = useState("");
  const [entradaCantidad, setEntradaCantidad] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [guardando, setGuardando] = useState(false);

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

  async function abrirEditar(producto) {
    setError("");
    try {
      const res = await fetch("/api/proveedores");
      if (!res.ok) throw new Error("No se pudieron cargar los proveedores.");
      const data = await res.json();
      setProveedores(Array.isArray(data) ? data : []);
      setForm({ ...producto, precio: String(producto.precio), cantidad: String(producto.cantidad), idProveedor: String(producto.idProveedor || "") });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nombre.trim() || !form.categoria || form.precio === "" || form.cantidad === "" || !form.fechaVencimiento) {
      setError("Completa código, nombre, categoría, precio, cantidad y fecha de vencimiento.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const original = productos.find((producto) => producto.idProducto === form.idProducto);
      const cambios = {
        codigo: form.codigo,
        nombre: form.nombre,
        categoria: form.categoria,
        precio: Number(form.precio),
        fechaVencimiento: form.fechaVencimiento,
        idProveedor: form.idProveedor ? Number(form.idProveedor) : null,
      };
      if (Number(form.cantidad) !== original?.cantidad) cambios.cantidad = Number(form.cantidad);
      const res = await fetch(`/api/productos/${form.idProducto}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar el producto.");
      setForm(null);
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(producto) {
    if (!confirm(`¿Eliminar ${producto.nombre}? Esta acción no se puede deshacer.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/productos/${producto.idProducto}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el producto.");
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

      {error && !form && tab !== "movimientos" && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

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
                {(editar || eliminar) && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
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
                  {(editar || eliminar) && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editar && <button className="text-xs text-bosque-600 underline underline-offset-2 mr-3" onClick={() => abrirEditar(p)} aria-label={`Editar ${p.nombre}`}>Editar</button>}
                      {eliminar && <button className="text-xs text-red-700 underline underline-offset-2" onClick={() => handleEliminar(p)} aria-label={`Eliminar ${p.nombre}`}>Eliminar</button>}
                    </td>
                  )}
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={editar || eliminar ? 6 : 5} className="px-4 py-8 text-center text-bosque-500 text-sm">
                    No hay productos en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <div className="fixed inset-0 bg-bosque-900/40 flex items-center justify-center px-4 z-10">
          <form onSubmit={handleGuardar} className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="editar-producto-titulo">
            <h2 id="editar-producto-titulo" className="font-display text-lg font-semibold text-bosque-700 mb-4">Editar producto</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="col-span-2 sm:col-span-1 text-xs font-medium text-bosque-700">Código
                <input required className="input-field mt-1" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </label>
              <label className="col-span-2 sm:col-span-1 text-xs font-medium text-bosque-700">Categoría
                <select required className="input-field mt-1" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {CATEGORIAS.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                </select>
              </label>
              <label className="col-span-2 text-xs font-medium text-bosque-700">Nombre
                <input required className="input-field mt-1" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </label>
              <label className="text-xs font-medium text-bosque-700">Precio (COP)
                <input required type="number" min="0" className="input-field mt-1" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </label>
              <label className="text-xs font-medium text-bosque-700">Cantidad
                <input required type="number" min="0" step="1" className="input-field mt-1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              </label>
              <label className="text-xs font-medium text-bosque-700">Fecha de vencimiento
                <input required type="date" className="input-field mt-1" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} />
              </label>
              <label className="text-xs font-medium text-bosque-700">Proveedor
                <select className="input-field mt-1" value={form.idProveedor} onChange={(e) => setForm({ ...form, idProveedor: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {proveedores.map((proveedor) => <option key={proveedor.idProveedor} value={proveedor.idProveedor}>{proveedor.nombre}</option>)}
                </select>
              </label>
            </div>
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn-secondary" disabled={guardando} onClick={() => { setForm(null); setError(""); }}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
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
