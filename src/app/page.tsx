"use client";

import dynamic from "next/dynamic";

const BmsDashboard = dynamic(() => import("@/components/dashboard/BmsDashboard").then((module) => module.BmsDashboard), {
  ssr: false,
  loading: () => <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] font-mono text-[11px] tracking-[0.16em] text-cyan-200">INICIANDO SENTINEL BMS…</div>,
});

export default function HomePage() {
  return <BmsDashboard />;
}
