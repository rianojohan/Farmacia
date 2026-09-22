"use client";

import { useEffect, useMemo, useState } from "react";
import { listProductos, listVentas, registrarVenta, getSession } from "@/lib/db";

function formatoCOP(valor) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState("");

  function recargar() {
    setProductos(listProductos());
    setVentas(listVentas());
  }

  useEffect(() => {
    recargar();
  }, []);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos.filter((p) => p.cantidad > 0 && (p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))).slice(0, 6);
  }, [productos, busqueda]);

  const total = carrito.reduce((sum, it) => sum + it.precio * it.cantidad, 0);

  function agregarAlCarrito(producto) {
    setCarrito((prev) => {
      const existente = prev.find((it) => it.idProducto === producto.idProducto);
      if (existente) {
        return prev.map((it) =>
          it.idProducto === producto.idProducto
            ? { ...it, cantidad: Math.min(it.cantidad + 1, producto.cantidad) }
            : it
        );
      }
      return [...prev, { idProducto: producto.idProducto, nombre: producto.nombre, precio: producto.precio, cantidad: 1, maxDisponible: producto.cantidad }];
    });
    setBusqueda("");
  }

  function cambiarCantidad(idProducto, cantidad) {
    setCarrito((prev) =>
      prev.map((it) => (it.idProducto === idProducto ? { ...it, cantidad: Math.max(1, Math.min(cantidad, it.maxDisponible)) } : it))
    );
  }

  function quitarDelCarrito(idProducto) {
    setCarrito((prev) => prev.filter((it) => it.idProducto !== idProducto));
  }

  function confirmarVenta() {
    if (carrito.length === 0) return;
    const sesion = getSession();
    registrarVenta(
      carrito.map(({ idProducto, nombre, precio, cantidad }) => ({ idProducto, nombre, precio, cantidad })),
      sesion?.idUsuario
    );
    setCarrito([]);
    setMensaje("Venta registrada correctamente. El inventario se actualizó.");
    recargar();
    setTimeout(() => setMensaje(""), 4000);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-bosque-700">Ventas</h1>
        <p className="text-sm text-bosque-500 mt-1">Busca productos, arma la venta y confirma para actualizar el inventario.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 relative">
            <label className="block text-xs font-medium text-bosque-700 mb-1">Buscar producto</label>
            <input
              className="input-field"
              placeholder="Nombre o código del producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {resultados.length > 0 && (
              <div className="absolute left-5 right-5 mt-1 bg-white border border-crema-200 rounded-xl shadow-card z-10 overflow-hidden">
                {resultados.map((p) => (
                  <button
                    key={p.idProducto}
                    onClick={() => agregarAlCarrito(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-crema-100 flex items-center justify-between"
                  >
                    <span>
                      <span className="font-medium text-bosque-700">{p.nombre}</span>{" "}
                      <span className="text-xs text-bosque-500">({p.codigo})</span>
                    </span>
                    <span className="text-xs text-bosque-500">{formatoCOP(p.precio)} · {p.cantidad} disp.</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Subtotal</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((it) => (
                  <tr key={it.idProducto} className="border-b border-crema-200 last:border-0">
                    <td className="px-4 py-3 font-medium text-bosque-700">{it.nombre}</td>
                    <td className="px-4 py-3">{formatoCOP(it.precio)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        max={it.maxDisponible}
                        className="input-field w-20"
                        value={it.cantidad}
                        onChange={(e) => cambiarCantidad(it.idProducto, Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3">{formatoCOP(it.precio * it.cantidad)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-red-700 underline underline-offset-2" onClick={() => quitarDelCarrito(it.idProducto)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {carrito.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-bosque-500 text-sm">
                      Busca un producto arriba para agregarlo a la venta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h2 className="font-display text-base font-semibold text-bosque-700 mb-4">Resumen de la venta</h2>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-bosque-500">Productos</span>
            <span>{carrito.length}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-bosque-700 mb-4">
            <span>Total</span>
            <span>{formatoCOP(total)}</span>
          </div>
          <button className="btn-primary w-full" disabled={carrito.length === 0} onClick={confirmarVenta}>
            Confirmar venta
          </button>
          {mensaje && <p className="text-xs text-bosque-600 bg-bosque-50 rounded-lg px-3 py-2 mt-3">{mensaje}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-base font-semibold text-bosque-700 mb-3">Ventas recientes</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.idVenta} className="border-b border-crema-200 last:border-0">
                  <td className="px-4 py-3 text-bosque-500">{v.fecha}</td>
                  <td className="px-4 py-3">{v.items.map((it) => it.nombre).join(", ")}</td>
                  <td className="px-4 py-3 font-medium text-bosque-700">{formatoCOP(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
