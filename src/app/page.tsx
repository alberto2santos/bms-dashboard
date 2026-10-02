"use client";

import dynamic from "next/dynamic";

const BmsDashboard = dynamic(() => import("@/components/dashboard/BmsDashboard").then((module) => module.BmsDashboard), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen flex-col justify-center bg-[#0B0F19] px-6 py-16 text-slate-100 sm:px-12">
      <header className="mx-auto w-full max-w-4xl">
        <p className="mb-4 text-sm font-semibold tracking-[0.16em] text-cyan-300">SENTINEL BMS · BUILDING MANAGEMENT SYSTEM</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Supervisão predial em um único painel</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
          Simule e acompanhe sistemas hidráulicos, alarmes de incêndio, energia, climatização, acessos e elevadores em uma interface de operação predial.
        </p>
      </header>
      <p className="mx-auto mt-10 w-full max-w-4xl text-sm text-slate-400" role="status">Carregando painel interativo…</p>
    </main>
  ),
});

export default function HomePage() {
  return <BmsDashboard />;
}
