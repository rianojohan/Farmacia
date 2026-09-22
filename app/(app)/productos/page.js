"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listProductos,
  upsertProducto,
  deleteProducto,
  listProveedores,
  getCategorias,
  diasParaVencer,
  UMBRAL_DIAS_VENCIMIENTO,
  UMBRAL_BAJO_STOCK,
} from "@/lib/db";

const VACIO = {
  idProducto: null,
  codigo: "",
  nombre: "",
  categoria: "",
  precio: "",
  cantidad: "",
  fechaVencimiento: "",
  idProveedor: "",
};

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setProductos(listProductos());
    setProveedores(listProveedores());
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  function abrirNuevo() {
    setForm(VACIO);
    setError("");
    setMostrarForm(true);
  }

  function abrirEditar(p) {
    setForm({ ...p, precio: String(p.precio), cantidad: String(p.cantidad), idProveedor: String(p.idProveedor) });
    setError("");
    setMostrarForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.codigo || !form.nombre || !form.categoria || !form.precio || !form.fechaVencimiento) {
      setError("Completa código, nombre, categoría, precio y fecha de vencimiento.");
      return;
    }
    const actualizados = upsertProducto({
      idProducto: form.idProducto || null,
      codigo: form.codigo,
      nombre: form.nombre,
      categoria: form.categoria,
      precio: Number(form.precio),
      cantidad: Number(form.cantidad || 0),
      fechaVencimiento: form.fechaVencimiento,
      idProveedor: form.idProveedor ? Number(form.idProveedor) : null,
    });
    setProductos([...actualizados]);
    setMostrarForm(false);
  }

  function handleEliminar(idProducto) {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
    const actualizados = deleteProducto(idProducto);
    setProductos([...actualizados]);
  }

  function estadoVencimiento(fecha) {
    const dias = diasParaVencer(fecha);
    if (dias < 0) return <span className="badge badge-danger">Vencido</span>;
    if (dias <= UMBRAL_DIAS_VENCIMIENTO) return <span className="badge badge-danger">{dias} días</span>;
    return <span className="text-bosque-500/80 text-xs">{dias} días</span>;
  }

  return (
    <div>
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bosque-700">Productos</h1>
          <p className="text-sm text-bosque-500 mt-1">Registra, modifica y consulta el catálogo de medicamentos.</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>
          + Registrar producto
        </button>
      </header>

      <input
        className="input-field max-w-sm mb-4"
        placeholder="Buscar por nombre, código o categoría…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Vencimiento</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.idProducto} className="border-b border-crema-200 last:border-0">
                <td className="px-4 py-3 text-bosque-500">{p.codigo}</td>
                <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                <td className="px-4 py-3">{p.categoria}</td>
                <td className="px-4 py-3">{Number(p.precio).toLocaleString("es-CO")}</td>
                <td className="px-4 py-3">
                  {p.cantidad === 0 ? (
                    <span className="badge badge-danger">Agotado</span>
                  ) : p.cantidad <= UMBRAL_BAJO_STOCK ? (
                    <span className="badge badge-warn">{p.cantidad}</span>
                  ) : (
                    p.cantidad
                  )}
                </td>
                <td className="px-4 py-3">{estadoVencimiento(p.fechaVencimiento)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button className="text-xs text-bosque-600 underline underline-offset-2 mr-3" onClick={() => abrirEditar(p)}>
                    Editar
                  </button>
                  <button className="text-xs text-red-700 underline underline-offset-2" onClick={() => handleEliminar(p.idProducto)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-bosque-500 text-sm">
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-bosque-900/40 flex items-center justify-center px-4 z-10">
          <form onSubmit={handleSubmit} className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-semibold text-bosque-700 mb-4">
              {form.idProducto ? "Editar producto" : "Registrar producto"}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-bosque-700 mb-1">Código</label>
                <input className="input-field" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-bosque-700 mb-1">Categoría</label>
                <select className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {getCategorias().map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-bosque-700 mb-1">Nombre</label>
                <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Precio (COP)</label>
                <input type="number" min="0" className="input-field" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Cantidad</label>
                <input type="number" min="0" className="input-field" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Fecha de vencimiento</label>
                <input type="date" className="input-field" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Proveedor</label>
                <select className="input-field" value={form.idProveedor} onChange={(e) => setForm({ ...form, idProveedor: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {proveedores.map((p) => (
                    <option key={p.idProveedor} value={p.idProveedor}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn-secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
