import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function respuesta(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return respuesta({ error: "Método no permitido." }, 405);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respuesta({ error: "No autenticado." }, 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return respuesta({ error: "No autenticado." }, 401);
  const { data: perfil, error: perfilError } = await admin.from("perfiles").select("rol").eq("user_id", auth.user.id).maybeSingle();
  if (perfilError || perfil?.rol !== "admin") return respuesta({ error: "Acceso exclusivo para administradores." }, 403);

  const body = await request.json().catch(() => ({}));
  const { accion, id } = body;
  if (accion === "listar") {
    const usuarios = [];
    let pagina = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (error) return respuesta({ error: "No se pudieron cargar los usuarios." }, 500);
      usuarios.push(...data.users);
      if (data.users.length < 200) break;
      pagina++;
    }
    const { data: perfiles, error } = await admin.from("perfiles").select("user_id, nombre, rol");
    if (error) return respuesta({ error: "No se pudieron cargar los perfiles." }, 500);
    const porId = new Map(perfiles.map((item) => [item.user_id, item]));
    return respuesta(usuarios.filter((user) => porId.has(user.id)).map((user) => ({
      id: user.id, correo: user.email, nombre: porId.get(user.id).nombre,
      rol: porId.get(user.id).rol, actual: user.id === auth.user.id,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  if (!["crear", "perfil", "clave", "eliminar"].includes(accion)) return respuesta({ error: "Operación no válida." }, 400);
  if (accion !== "crear" && (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return respuesta({ error: "Usuario no válido." }, 400);
  if ((accion === "eliminar" || accion === "perfil") && id === auth.user.id) return respuesta({ error: "No puedes eliminar ni cambiar el perfil de tu propia cuenta." }, 400);
  if ((accion === "crear" || accion === "perfil") && !["admin", "empleado"].includes(body.rol)) return respuesta({ error: "Selecciona un perfil válido." }, 400);
  if ((accion === "crear" || accion === "clave") && (typeof body.clave !== "string" || body.clave.length < 10 || body.clave.length > 72)) return respuesta({ error: "La contraseña debe tener entre 10 y 72 caracteres." }, 400);

  let objetivo = id;
  if (accion === "crear") {
    if (typeof body.nombre !== "string" || !body.nombre.trim() || body.nombre.trim().length > 100 || typeof body.correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo.trim())) return respuesta({ error: "Introduce un nombre y un correo válidos." }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email: body.correo.trim().toLowerCase(), password: body.clave, email_confirm: true, user_metadata: { nombre: body.nombre.trim() } });
    if (error || !data.user) return respuesta({ error: "No se pudo crear el usuario. Comprueba que el correo no esté registrado y que la contraseña cumpla los requisitos." }, 400);
    objetivo = data.user.id;
    const { data: actualizado, error: profileError } = await admin.from("perfiles").update({ nombre: body.nombre.trim(), rol: body.rol }).eq("user_id", objetivo).select("user_id").maybeSingle();
    if (profileError || !actualizado) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(objetivo);
      return respuesta({ error: rollbackError ? "Se creó la cuenta, pero no se pudo asignar el perfil ni revertirla; revisa la cuenta en Supabase." : "No se pudo asignar el perfil; la cuenta fue revertida." }, 500);
    }
  } else if (accion === "perfil") {
    const { data, error } = await admin.from("perfiles").update({ rol: body.rol }).eq("user_id", id).select("user_id").maybeSingle();
    if (error || !data) return respuesta({ error: "No se pudo cambiar el perfil del usuario." }, 400);
  } else if (accion === "clave") {
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.clave });
    if (error) return respuesta({ error: "No se pudo cambiar la contraseña." }, 400);
  } else {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return respuesta({ error: "No se pudo eliminar el usuario. Comprueba que la cuenta exista." }, 400);
  }
  const { error: auditError } = await admin.from("bitacora").insert({ id_usuario: auth.user.id, accion: `usuario_${accion}`, detalle: { usuario_id: objetivo, ...(accion === "crear" || accion === "perfil" ? { rol: body.rol } : {}) } });
  return respuesta({ ok: true, ...(auditError ? { advertencia: "La operación se completó, pero no pudo registrarse en la bitácora." } : {}) });
});
