"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/db";

const LINKS = [
  { href: "/dashboard", label: "Panel principal", icon: "home" },
  { href: "/productos", label: "Productos", icon: "box" },
  { href: "/inventario", label: "Inventario", icon: "stack" },
  { href: "/ventas", label: "Ventas", icon: "cart" },
  { href: "/proveedores", label: "Proveedores", icon: "truck" },
  { href: "/reportes", label: "Reportes", icon: "chart" },
];

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9h14v-9" /></svg>;
    case "box":
      return <svg {...common}><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;
    case "stack":
      return <svg {...common}><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" /></svg>;
    case "cart":
      return <svg {...common}><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2.5 3h2.5l2.9 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6" /></svg>;
    case "truck":
      return <svg {...common}><path d="M2 7h11v9H2z" /><path d="M13 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="1.6" /><circle cx="16.5" cy="18" r="1.6" /></svg>;
    case "chart":
      return <svg {...common}><path d="M4 20V10" /><path d="M11 20V4" /><path d="M18 20v-7" /></svg>;
    default:
      return null;
  }
}

export default function Sidebar({ sesion }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-bosque-700 text-crema-50 flex flex-col min-h-screen">
      <div className="px-5 py-6 border-b border-bosque-600/60">
        <p className="font-display text-lg font-semibold leading-tight">Solo la Salud</p>
        <p className="text-xs text-bosque-100/80 mt-0.5">Gestión de droguería</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active ? "bg-crema-50 text-bosque-700 font-medium" : "text-crema-100/90 hover:bg-bosque-600/60"
              }`}
            >
              <Icon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-bosque-600/60">
        <p className="text-xs text-crema-100/70">Sesión activa</p>
        <p className="text-sm font-medium">{sesion?.nombre}</p>
        <p className="text-xs text-crema-100/70 capitalize mb-3">{sesion?.rol}</p>
        <button onClick={handleLogout} className="text-xs text-crema-100/90 underline underline-offset-2 hover:text-crema-50">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
