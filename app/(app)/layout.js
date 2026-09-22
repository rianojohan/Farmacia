"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import AlertObserver from "@/components/AlertObserver";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [sesion, setSesion] = useState(undefined);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSesion(s);
    }
  }, [router]);

  if (sesion === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema-100">
        <p className="text-bosque-500 font-display">Cargando…</p>
      </div>
    );
  }

  if (!sesion) return null;

  return (
    <div className="flex min-h-screen bg-crema-100">
      <Sidebar sesion={sesion} />
      <main className="flex-1 px-8 py-7">{children}</main>
      <AlertObserver />
    </div>
  );
}
