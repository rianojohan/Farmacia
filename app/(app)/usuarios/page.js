"use client";

import { useEffect, useState } from "react";

const VACIO = { nombre: "", correo: "", clave: "", rol: "empleado" };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(VACIO);

  async function cargar() {
    const respuesta = await fetch("/api/usuarios", { cache: "no-store" });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || "No se pudieron cargar los usuarios.");
    setUsuarios(datos);
  }

  useEffect(() => {
    cargar().catch((err) => setError(err.message)).finally(() => setCargando(false));
  }, []);

  async function ejecutar(datos, mensaje) {
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo completar la operación.");
      setModal(null);
      setForm(VACIO);
      setAviso(resultado.advertencia || mensaje);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function abrirCrear() {
    setForm(VACIO);
    setError("");
    setModal({ tipo: "crear" });
  }

  function abrirClave(usuario) {
    setForm(VACIO);
    setError("");
    setModal({ tipo: "clave", usuario });
  }

  function guardar(evento) {
    evento.preventDefault();
    if (modal.tipo === "crear") ejecutar({ accion: "crear", ...form }, "Usuario creado correctamente.");
    else ejecutar({ accion: "clave", id: modal.usuario.id, clave: form.clave }, "Contraseña actualizada correctamente.");
  }

  return (
    <div>
      <header className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bosque-700">Gestión de usuarios</h1>
          <p className="text-sm text-bosque-500 mt-1">Crea cuentas y administra los perfiles y contraseñas del equipo.</p>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>+ Crear usuario</button>
      </header>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {aviso && <p role="status" className="text-sm text-bosque-700 bg-bosque-100 rounded-lg px-3 py-2 mb-4">{aviso}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-bosque-500 border-b border-crema-200">
            <th className="px-4 py-3 font-medium">Nombre</th><th className="px-4 py-3 font-medium">Correo</th><th className="px-4 py-3 font-medium">Perfil</th><th className="px-4 py-3 font-medium">Acciones</th>
          </tr></thead>
          <tbody>
            {usuarios.map((usuario) => <tr key={usuario.id} className="border-b border-crema-200 last:border-0">
              <td className="px-4 py-3 font-medium text-bosque-700">{usuario.nombre}{usuario.actual && <span className="ml-2 text-xs text-bosque-500">(tu cuenta)</span>}</td>
              <td className="px-4 py-3">{usuario.correo}</td>
              <td className="px-4 py-3">
                <select className="input-field min-w-[150px]" aria-label={`Perfil de ${usuario.nombre}`} value={usuario.rol} disabled={usuario.actual || ocupado} onChange={(evento) => {
                  const rol = evento.target.value;
                  if (confirm(`¿Cambiar el perfil de ${usuario.nombre} a ${rol === "admin" ? "administrador" : "empleado"}?`)) ejecutar({ accion: "perfil", id: usuario.id, rol }, "Perfil actualizado correctamente.");
                }}><option value="empleado">Empleado</option><option value="admin">Administrador</option></select>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button className="text-xs text-bosque-600 underline underline-offset-2 mr-3" disabled={ocupado} onClick={() => abrirClave(usuario)}>Cambiar contraseña</button>
                {!usuario.actual && <button className="text-xs text-red-700 underline underline-offset-2" disabled={ocupado} onClick={() => {
                  if (confirm(`¿Eliminar a ${usuario.nombre}? Su acceso se revocará y se conservará su historial de operaciones.`)) ejecutar({ accion: "eliminar", id: usuario.id }, "Usuario eliminado correctamente.");
                }}>Eliminar</button>}
              </td>
            </tr>)}
            {!cargando && usuarios.length === 0 && !error && <tr><td colSpan={4} className="px-4 py-8 text-center text-bosque-500">No hay usuarios registrados.</td></tr>}
            {cargando && <tr><td colSpan={4} className="px-4 py-8 text-center text-bosque-500">Cargando usuarios...</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-bosque-500 mt-3">Por seguridad, no puedes cambiar tu propio perfil ni eliminar tu cuenta.</p>

      {modal && <div className="fixed inset-0 bg-bosque-900/40 flex items-center justify-center px-4 z-10">
        <form onSubmit={guardar} className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-usuario">
          <h2 id="titulo-usuario" className="font-display text-lg font-semibold text-bosque-700 mb-4">{modal.tipo === "crear" ? "Crear usuario" : `Cambiar contraseña de ${modal.usuario.nombre}`}</h2>
          <div className="space-y-3">
            {modal.tipo === "crear" && <>
              <label className="block text-xs font-medium text-bosque-700">Nombre<input className="input-field mt-1" required maxLength={100} value={form.nombre} onChange={(evento) => setForm({ ...form, nombre: evento.target.value })} /></label>
              <label className="block text-xs font-medium text-bosque-700">Correo electrónico<input className="input-field mt-1" required type="email" autoComplete="off" value={form.correo} onChange={(evento) => setForm({ ...form, correo: evento.target.value })} /></label>
              <label className="block text-xs font-medium text-bosque-700">Perfil<select className="input-field mt-1" value={form.rol} onChange={(evento) => setForm({ ...form, rol: evento.target.value })}><option value="empleado">Empleado</option><option value="admin">Administrador</option></select></label>
            </>}
            <label className="block text-xs font-medium text-bosque-700">{modal.tipo === "crear" ? "Contraseña inicial" : "Nueva contraseña"}<input className="input-field mt-1" required type="password" minLength={10} maxLength={72} autoComplete="new-password" value={form.clave} onChange={(evento) => setForm({ ...form, clave: evento.target.value })} /></label>
            <p className="text-xs text-bosque-500">Mínimo 10 caracteres. Comparte la contraseña por un canal privado.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</p>}
          <div className="flex justify-end gap-2 mt-5"><button type="button" className="btn-secondary" disabled={ocupado} onClick={() => { setModal(null); setError(""); setForm(VACIO); }}>Cancelar</button><button type="submit" className="btn-primary" disabled={ocupado}>{ocupado ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </div>}
    </div>
  );
}
