"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/components/SesionContext";
import { puedeEditar, puedeEliminar } from "@/lib/permisos";

const VACIO = { idProveedor: null, nombre: "", telefono: "", correo: "", direccion: "" };

/**
 * Proveedores.
 * - Admin y empleado pueden consultar y registrar proveedores.
 * - Solo el administrador ve y puede usar editar y eliminar.
 */
export default function ProveedoresPage() {
  const sesion = useSesion();
  const editar = puedeEditar(sesion?.rol);
  const eliminar = puedeEliminar(sesion?.rol);

  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then((data) => setProveedores(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar los proveedores."));
  }, []);

  function abrirNuevo() {
    setForm(VACIO);
    setError("");
    setMostrarForm(true);
  }

  function abrirEditar(p) {
    setForm(p);
    setError("");
    setMostrarForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre || !form.telefono) {
      setError("Completa al menos el nombre y el teléfono.");
      return;
    }
    const esEdicion = Boolean(form.idProveedor);
    try {
      const res = await fetch(esEdicion ? `/api/proveedores/${form.idProveedor}` : "/api/proveedores", {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el proveedor.");
      setProveedores((prev) =>
        (esEdicion ? prev.map((p) => (p.idProveedor === data.idProveedor ? data : p)) : [...prev, data]).sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        )
      );
      setMostrarForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEliminar(idProveedor) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    const res = await fetch(`/api/proveedores/${idProveedor}`, { method: "DELETE" });
    if (res.ok) {
      setProveedores((prev) => prev.filter((p) => p.idProveedor !== idProveedor));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el proveedor.");
    }
  }

  return (
    <div>
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bosque-700">Proveedores</h1>
          <p className="text-sm text-bosque-500 mt-1">
            Consulta y registra los proveedores de la droguería.
            {editar ? " Como administrador también puedes editar y eliminar." : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>
          + Registrar proveedor
        </button>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              {editar && <th className="px-4 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.idProveedor} className="border-b border-crema-200 last:border-0">
                <td className="px-4 py-3 font-medium text-bosque-700">{p.nombre}</td>
                <td className="px-4 py-3">{p.telefono}</td>
                <td className="px-4 py-3">{p.correo}</td>
                <td className="px-4 py-3">{p.direccion}</td>
                {editar && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button className="text-xs text-bosque-600 underline underline-offset-2 mr-3" onClick={() => abrirEditar(p)}>
                      Editar
                    </button>
                    {eliminar && (
                      <button className="text-xs text-red-700 underline underline-offset-2" onClick={() => handleEliminar(p.idProveedor)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {proveedores.length === 0 && (
              <tr>
                <td colSpan={editar ? 5 : 4} className="px-4 py-8 text-center text-bosque-500 text-sm">
                  No hay proveedores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-bosque-900/40 flex items-center justify-center px-4 z-10">
          <form onSubmit={handleSubmit} className="card w-full max-w-md p-6">
            <h2 className="font-display text-lg font-semibold text-bosque-700 mb-4">
              {form.idProveedor ? "Editar proveedor" : "Registrar proveedor"}
            </h2>
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Nombre</label>
                <input className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Teléfono</label>
                <input className="input-field" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Correo</label>
                <input className="input-field" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bosque-700 mb-1">Dirección</label>
                <input className="input-field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
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
