"use client";

/**
 * Capa de datos del prototipo "Solo la Salud".
 *
 * Simula la base de datos usando localStorage en el navegador, para que el
 * prototipo se pueda desplegar en Vercel sin configurar un servidor de BD.
 * Las entidades reflejan el diagrama de clases del proyecto:
 * Usuario, Producto, Venta, Proveedor, Compra, Inventario, Reporte.
 *
 * Cuando el equipo quiera pasar a una base de datos real (Postgres/Supabase),
 * solo hay que reemplazar las funciones de este archivo por llamadas a la API;
 * los componentes de las páginas no necesitan cambiar su forma de uso.
 *
 * Organización (Modelo Vista Controlador + microservicios lógicos):
 * este archivo hace las veces de Modelo y agrupa las operaciones por
 * "microservicio": Productos, Inventario, Ventas, Proveedores, Compras y
 * Reportes. Las páginas de app/ actúan como Vista + Controlador: reciben la
 * acción del usuario, llaman a la función correspondiente de este archivo y
 * muestran el resultado.
 *
 * Patrón Observer: al final de este archivo se define un pequeño "sujeto"
 * (observador) al que los componentes se suscriben (por ejemplo
 * components/AlertObserver.js). Cuando una venta o un movimiento de
 * inventario deja un producto en bajo stock, agotado o próximo a vencer,
 * este módulo emite un evento y todos los suscriptores son notificados
 * automáticamente, sin que el Modelo necesite conocerlos.
 */

const DB_KEY = "sls_db_v1";
const SESSION_KEY = "sls_session_v1";

const CATEGORIAS = [
  "Analgésicos",
  "Antibióticos",
  "Antigripales",
  "Vitaminas y suplementos",
  "Cuidado personal",
  "Dermatológicos",
  "Otros",
];

function seedData() {
  const hoy = new Date();
  const dias = (n) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const usuarios = [
    { idUsuario: 1, nombre: "Administrador", correo: "admin@solalasalud.com", contrasena: "admin123", rol: "admin" },
    { idUsuario: 2, nombre: "Empleado Mostrador", correo: "empleado@solalasalud.com", contrasena: "empleado123", rol: "empleado" },
  ];

  const proveedores = [
    { idProveedor: 1, nombre: "Distribuidora MediFarma", telefono: "6017894512", correo: "ventas@medifarma.com", direccion: "Cra 10 # 20-30, Bogotá" },
    { idProveedor: 2, nombre: "Laboratorios San Rafael", telefono: "6017123456", correo: "contacto@sanrafael.com", direccion: "Calle 45 # 12-05, Medellín" },
  ];

  const productos = [
    { idProducto: 1, codigo: "MED-001", nombre: "Acetaminofén 500mg x20", categoria: "Analgésicos", precio: 8500, cantidad: 120, fechaVencimiento: dias(220), idProveedor: 1 },
    { idProducto: 2, codigo: "MED-002", nombre: "Ibuprofeno 400mg x10", categoria: "Analgésicos", precio: 7200, cantidad: 8, fechaVencimiento: dias(15), idProveedor: 1 },
    { idProducto: 3, codigo: "MED-003", nombre: "Amoxicilina 500mg x12", categoria: "Antibióticos", precio: 15900, cantidad: 45, fechaVencimiento: dias(180), idProveedor: 2 },
    { idProducto: 4, codigo: "MED-004", nombre: "Loratadina 10mg x10", categoria: "Antigripales", precio: 6300, cantidad: 60, fechaVencimiento: dias(300), idProveedor: 2 },
    { idProducto: 5, codigo: "MED-005", nombre: "Vitamina C 1g x10 efervescente", categoria: "Vitaminas y suplementos", precio: 12800, cantidad: 5, fechaVencimiento: dias(25), idProveedor: 1 },
    { idProducto: 6, codigo: "MED-006", nombre: "Alcohol antiséptico 350ml", categoria: "Cuidado personal", precio: 9500, cantidad: 0, fechaVencimiento: dias(400), idProveedor: 2 },
    { idProducto: 7, codigo: "MED-007", nombre: "Crema hidratante corporal 200ml", categoria: "Dermatológicos", precio: 21000, cantidad: 30, fechaVencimiento: dias(500), idProveedor: 1 },
  ];

  const ventas = [
    {
      idVenta: 1,
      fecha: dias(0),
      idUsuario: 2,
      items: [
        { idProducto: 1, nombre: "Acetaminofén 500mg x20", cantidad: 2, precio: 8500 },
        { idProducto: 4, nombre: "Loratadina 10mg x10", cantidad: 1, precio: 6300 },
      ],
      total: 2 * 8500 + 6300,
    },
    {
      idVenta: 2,
      fecha: dias(-1),
      idUsuario: 2,
      items: [{ idProducto: 3, nombre: "Amoxicilina 500mg x12", cantidad: 1, precio: 15900 }],
      total: 15900,
    },
  ];

  const compras = [
    { idCompra: 1, fecha: dias(-10), idProveedor: 1, total: 450000 },
    { idCompra: 2, fecha: dias(-5), idProveedor: 2, total: 210000 },
  ];

  const movimientosInventario = [
    { idInventario: 1, idProducto: 1, tipo: "entrada", cantidad: 100, fecha: dias(-20) },
    { idInventario: 2, idProducto: 1, tipo: "salida", cantidad: 2, fecha: dias(0) },
  ];

  return { usuarios, proveedores, productos, ventas, compras, movimientosInventario };
}

function readDb() {
  if (typeof window === "undefined") return seedData();
  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const data = seedData();
    window.localStorage.setItem(DB_KEY, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const data = seedData();
    window.localStorage.setItem(DB_KEY, JSON.stringify(data));
    return data;
  }
}

function writeDb(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function nextId(list, key) {
  return list.reduce((max, item) => Math.max(max, item[key] || 0), 0) + 1;
}

/* ------------------------- Sesión / autenticación ------------------------ */

export function login(correo, contrasena) {
  const db = readDb();
  const usuario = db.usuarios.find(
    (u) => u.correo.toLowerCase() === correo.toLowerCase() && u.contrasena === contrasena
  );
  if (!usuario) return null;
  const sesion = { idUsuario: usuario.idUsuario, nombre: usuario.nombre, rol: usuario.rol };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
  return sesion;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

/* --------------------------------- Catálogo ------------------------------ */

export function getCategorias() {
  return CATEGORIAS;
}

/* --------------------------------- Productos ------------------------------ */

export function listProductos() {
  return readDb().productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function getProducto(idProducto) {
  return readDb().productos.find((p) => p.idProducto === idProducto) || null;
}

export function upsertProducto(producto) {
  const db = readDb();
  if (producto.idProducto) {
    db.productos = db.productos.map((p) =>
      p.idProducto === producto.idProducto ? { ...p, ...producto } : p
    );
  } else {
    const idProducto = nextId(db.productos, "idProducto");
    db.productos.push({ ...producto, idProducto });
  }
  writeDb(db);
  return db.productos;
}

export function deleteProducto(idProducto) {
  const db = readDb();
  db.productos = db.productos.filter((p) => p.idProducto !== idProducto);
  writeDb(db);
  return db.productos;
}

export function diasParaVencer(fechaVencimiento) {
  const hoy = new Date();
  const fecha = new Date(fechaVencimiento);
  const diffMs = fecha.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const UMBRAL_BAJO_STOCK = 10;
export const UMBRAL_DIAS_VENCIMIENTO = 30;

/**
 * Búsqueda rápida de productos (microservicio de productos).
 * Utilizada por el buscador central del panel principal: permite consultar
 * por nombre o código y obtener en un solo resultado la información que el
 * empleado necesita para decidir si revisa el inventario o registra una venta.
 */
export function buscarProductosRapido(texto, limite = 6) {
  const q = (texto || "").trim().toLowerCase();
  if (!q) return [];
  return readDb()
    .productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
    .slice(0, limite);
}

/* -------------------------------- Proveedores ----------------------------- */

export function listProveedores() {
  return readDb().proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function upsertProveedor(proveedor) {
  const db = readDb();
  if (proveedor.idProveedor) {
    db.proveedores = db.proveedores.map((p) =>
      p.idProveedor === proveedor.idProveedor ? { ...p, ...proveedor } : p
    );
  } else {
    const idProveedor = nextId(db.proveedores, "idProveedor");
    db.proveedores.push({ ...proveedor, idProveedor });
  }
  writeDb(db);
  return db.proveedores;
}

export function deleteProveedor(idProveedor) {
  const db = readDb();
  db.proveedores = db.proveedores.filter((p) => p.idProveedor !== idProveedor);
  writeDb(db);
  return db.proveedores;
}

/* ---------------------------------- Ventas -------------------------------- */

export function listVentas() {
  return readDb().ventas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function registrarVenta(items, idUsuario) {
  const db = readDb();
  const idVenta = nextId(db.ventas, "idVenta");
  const total = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  const fecha = new Date().toISOString().slice(0, 10);

  db.ventas.push({ idVenta, fecha, idUsuario, items, total });

  // Actualiza inventario (descuenta cantidad y registra movimiento de salida)
  items.forEach((it) => {
    db.productos = db.productos.map((p) =>
      p.idProducto === it.idProducto ? { ...p, cantidad: Math.max(0, p.cantidad - it.cantidad) } : p
    );
    const idInventario = nextId(db.movimientosInventario, "idInventario");
    db.movimientosInventario.push({
      idInventario,
      idProducto: it.idProducto,
      tipo: "salida",
      cantidad: it.cantidad,
      fecha,
    });
  });

  writeDb(db);

  // Patrón Observer: el cambio de inventario que produjo esta venta puede
  // dejar productos en bajo stock, agotados o cerca de vencer. Se notifica
  // a los componentes suscritos (ver AlertObserver) en lugar de que este
  // Modelo tenga que conocer la interfaz que mostrará la alerta.
  const idsAfectados = items.map((it) => it.idProducto);
  revisarAlertasInventario(db.productos.filter((p) => idsAfectados.includes(p.idProducto)));

  return db.ventas;
}

/**
 * Venta rápida de un solo producto, pensada para la consulta central del
 * panel principal: el empleado busca el producto, ve su información y puede
 * registrar la venta desde la misma vista sin volver al menú de Ventas.
 */
export function registrarVentaRapida(producto, cantidad, idUsuario) {
  if (!producto || producto.cantidad <= 0) return listVentas();
  const cantidadValida = Math.max(1, Math.min(Number(cantidad) || 1, producto.cantidad));
  return registrarVenta(
    [{ idProducto: producto.idProducto, nombre: producto.nombre, precio: producto.precio, cantidad: cantidadValida }],
    idUsuario
  );
}

/* -------------------------------- Inventario ------------------------------ */

export function listMovimientosInventario() {
  return readDb()
    .movimientosInventario.slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function registrarEntradaInventario(idProducto, cantidad) {
  const db = readDb();
  db.productos = db.productos.map((p) =>
    p.idProducto === idProducto ? { ...p, cantidad: p.cantidad + cantidad } : p
  );
  const idInventario = nextId(db.movimientosInventario, "idInventario");
  db.movimientosInventario.push({
    idInventario,
    idProducto,
    tipo: "entrada",
    cantidad,
    fecha: new Date().toISOString().slice(0, 10),
  });
  writeDb(db);

  const producto = db.productos.find((p) => p.idProducto === idProducto);
  if (producto) revisarAlertasInventario([producto]);

  return db.productos;
}

/* --------------------------------- Compras -------------------------------- */

export function listCompras() {
  return readDb().compras.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function registrarCompra(idProveedor, total) {
  const db = readDb();
  const idCompra = nextId(db.compras, "idCompra");
  db.compras.push({ idCompra, fecha: new Date().toISOString().slice(0, 10), idProveedor, total });
  writeDb(db);
  return db.compras;
}

/* --------------------------------- Reportes ------------------------------- */

export function resumenPanel() {
  const db = readDb();
  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = db.ventas.filter((v) => v.fecha === hoy);
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
  const totalVentas = db.ventas.reduce((sum, v) => sum + v.total, 0);
  const bajoStock = db.productos.filter((p) => p.cantidad > 0 && p.cantidad <= UMBRAL_BAJO_STOCK);
  const agotados = db.productos.filter((p) => p.cantidad === 0);
  const porVencer = db.productos.filter((p) => {
    const dias = diasParaVencer(p.fechaVencimiento);
    return dias >= 0 && dias <= UMBRAL_DIAS_VENCIMIENTO;
  });

  return {
    totalProductos: db.productos.length,
    ventasHoyCount: ventasHoy.length,
    totalVentasHoy,
    totalVentas,
    bajoStock,
    agotados,
    porVencer,
  };
}

export function productosMasVendidos() {
  const db = readDb();
  const conteo = {};
  db.ventas.forEach((v) => {
    v.items.forEach((it) => {
      if (!conteo[it.idProducto]) {
        conteo[it.idProducto] = { idProducto: it.idProducto, nombre: it.nombre, cantidad: 0, total: 0 };
      }
      conteo[it.idProducto].cantidad += it.cantidad;
      conteo[it.idProducto].total += it.precio * it.cantidad;
    });
  });
  return Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad);
}

export function ventasPorDia() {
  const db = readDb();
  const porDia = {};
  db.ventas.forEach((v) => {
    porDia[v.fecha] = (porDia[v.fecha] || 0) + v.total;
  });
  return Object.entries(porDia)
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
}

export function resetDb() {
  const data = seedData();
  writeDb(data);
  return data;
}

/* ------------------------------- Patrón Observer --------------------------
 *
 * "Sujeto" observable minimalista: los componentes de la Vista se suscriben
 * con `suscribirAlertas(callback)` y, cuando el Modelo detecta un cambio
 * relevante en el inventario (bajo stock, agotado o próximo a vencer),
 * `revisarAlertasInventario` notifica a todos los suscriptores llamando a su
 * callback con el detalle de la alerta. Así se generan avisos automáticos
 * sin acoplar la lógica de negocio a un componente de interfaz específico.
 * -------------------------------------------------------------------------- */

const suscriptoresAlertas = new Set();

export function suscribirAlertas(callback) {
  suscriptoresAlertas.add(callback);
  return () => suscriptoresAlertas.delete(callback);
}

function notificarAlerta(alerta) {
  suscriptoresAlertas.forEach((callback) => callback(alerta));
}

function revisarAlertasInventario(productos) {
  productos.forEach((p) => {
    if (p.cantidad === 0) {
      notificarAlerta({ tipo: "agotado", producto: p, mensaje: `${p.nombre} se agotó.` });
    } else if (p.cantidad <= UMBRAL_BAJO_STOCK) {
      notificarAlerta({
        tipo: "bajo-stock",
        producto: p,
        mensaje: `${p.nombre} tiene bajo stock (${p.cantidad} unidades).`,
      });
    }

    const dias = diasParaVencer(p.fechaVencimiento);
    if (dias >= 0 && dias <= UMBRAL_DIAS_VENCIMIENTO) {
      notificarAlerta({
        tipo: "por-vencer",
        producto: p,
        mensaje: `${p.nombre} vence en ${dias} día${dias === 1 ? "" : "s"}.`,
      });
    }
  });
}
