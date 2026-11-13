"use client";

import { useRouter } from "next/navigation";
import { SesionProvider, useSesion } from "@/components/SesionContext";
import Sidebar from "@/components/Sidebar";
import AlertObserver from "@/components/AlertObserver";

function ContenidoApp({ children }) {
  const router = useRouter();
  const sesion = useSesion();

  if (sesion === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema-100">
        <p className="text-bosque-500 font-display">Cargando…</p>
      </div>
    );
  }

  if (!sesion) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-crema-100">
      <Sidebar />
      <main className="flex-1 px-8 py-7">{children}</main>
      <AlertObserver />
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <SesionProvider>
      <ContenidoApp>{children}</ContenidoApp>
    </SesionProvider>
  );
}
