"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/db";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const sesion = getSession();
    router.replace(sesion ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-crema-100">
      <p className="text-bosque-500 font-display text-lg">Cargando Solo la Salud…</p>
    </div>
  );
}
