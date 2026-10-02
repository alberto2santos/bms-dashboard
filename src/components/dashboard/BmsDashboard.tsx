"use client";

import { useCallback, useLayoutEffect, useState, type ReactNode } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Activity, ArrowDownUp, BellRing, Building2, ChevronRight, Gauge, Github, Mail, ShieldCheck, Waves, Zap } from "lucide-react";
import { useBmsSimulation } from "@/hooks/useBmsSimulation";
import { useWeather } from "@/hooks/useWeather";
import { useBmsStore } from "@/store/useBmsStore";
import { countOutstandingAlarms } from "@/services/alarmLifecycle";
import { primeAudio } from "@/utils/audioAlert";
import { EventLog } from "@/components/dashboard/EventLog";
import { ElevatorPanel } from "@/components/dashboard/ElevatorPanel";
import { FirePanel } from "@/components/dashboard/FirePanel";
import { GatePanel } from "@/components/dashboard/GatePanel";
import { HvacPanel } from "@/components/dashboard/HvacPanel";
import { HeaderBar } from "@/components/dashboard/HeaderBar";
import { HydraulicPanel } from "@/components/dashboard/HydraulicPanel";
import { LightingPanel } from "@/components/dashboard/LightingPanel";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { SidebarNavigation } from "@/components/dashboard/SidebarNavigation";
import { SimulationControls } from "@/components/dashboard/SimulationControls";

const moduleReveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: false, amount: 0.12 },
  transition: { duration: 0.38, ease: "easeOut" as const },
};

function MetricCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: "cyan" | "emerald" | "sky" | "rose" }) {
  const tones = {
    cyan: "border-cyan-300/10 bg-cyan-300/[0.035] text-cyan-200",
    emerald: "border-emerald-300/10 bg-emerald-300/[0.035] text-emerald-200",
    sky: "border-sky-400/10 bg-sky-400/[0.035] text-sky-400",
    rose: "border-rose-300/10 bg-rose-300/[0.035] text-rose-200",
  };
  return <div className="panel-surface flex min-w-0 items-center gap-3 rounded-xl px-4 py-3.5"><div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${tones[tone]}`}>{icon}</div><div className="min-w-0"><p className="truncate text-[9px] font-semibold tracking-[0.13em] text-slate-500">{label}</p><p className="mt-1 truncate text-[14px] font-semibold text-slate-100">{value}<span className="ml-1.5 text-[9px] font-normal text-slate-500">{detail}</span></p></div></div>;
}

export function BmsDashboard() {
  useBmsSimulation();
  useWeather();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    try {
      return window.localStorage.getItem("sentinel-bms-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  const toggleNavigation = useCallback(() => setNavigationOpen((open) => !open), []);
  const toggleTheme = useCallback(() => setTheme((current) => current === "dark" ? "light" : "dark"), []);
  const tankLevel = useBmsStore((state) => state.tankLevel);
  const energyKw = useBmsStore((state) => state.energyKw);
  const fireInterlock = useBmsStore((state) => state.fireInterlock);
  const activeAlarms = useBmsStore((state) => state.alarms.filter((alarm) => alarm.status === "active").length);
  const outstandingAlarms = useBmsStore((state) => countOutstandingAlarms(state.alarms));
  const gateStatus = useBmsStore((state) => state.gate.status);
  const allOperational = outstandingAlarms === 0 && !fireInterlock;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("sentinel-bms-theme", theme);
    } catch {
      // O tema escolhido continua ativo nesta sessão se o armazenamento não estiver disponível.
    }
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell min-h-screen bg-[#0B0F19] text-slate-200 selection:bg-cyan-300/20" onPointerDown={() => { void primeAudio(); }}>
      <HeaderBar onOpenSettings={() => setSettingsOpen(true)} onToggleNavigation={toggleNavigation} navigationOpen={navigationOpen} theme={theme} onToggleTheme={toggleTheme} />
      <div className="mx-auto flex max-w-[1680px] items-start gap-3 sm:px-5 lg:gap-5 lg:px-8">
        <SidebarNavigation mobileOpen={navigationOpen} onClose={closeNavigation} />
        <main className="relative min-w-0 flex-1 px-4 pb-12 pt-7 sm:px-2 lg:px-0 lg:pt-9">
          <div className="dashboard-grid pointer-events-none absolute inset-x-5 top-0 h-[330px] opacity-[0.13]" />
          <div className="relative">
            <motion.section {...moduleReveal} id="overview" data-bms-section className="scroll-mt-24">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-slate-500"><Building2 size={12} className="text-cyan-300" />SENTINEL TOWER <ChevronRight size={11} /><span>OPERAÇÃO</span></div>
                  <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-white sm:text-[30px]">Visão geral do edifício</h1>
                  <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-slate-500">Telemetria de hidráulica, energia, climatização, incêndio, acessos e elevadores.</p>
                </div>
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-bold tracking-[0.1em] ${allOperational ? "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-200" : "border-rose-300/20 bg-rose-300/[0.07] text-rose-200"}`}><ShieldCheck size={13} />{fireInterlock ? "INTERLOCK DE INCÊNDIO" : allOperational ? "TODOS OS SISTEMAS OPERACIONAIS" : "EVENTOS REQUEREM ATENÇÃO"}</div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <MetricCard icon={<Waves size={16} />} label="NÍVEL DO RESERVATÓRIO" value={`${tankLevel.toFixed(1)}%`} detail="Reservatório A" tone="cyan" />
                <MetricCard icon={<Zap size={16} />} label="DEMANDA ATUAL" value={`${energyKw.toFixed(1)} kW`} detail="Instantânea" tone="sky" />
                <MetricCard icon={<ArrowDownUp size={16} />} label="PORTÃO PRINCIPAL" value={gateStatus === "open" ? "Aberto" : gateStatus === "closed" ? "Fechado" : gateStatus === "stopped" ? "Parado" : gateStatus === "opening" ? "Abrindo" : "Fechando"} detail="Acesso G-01" tone="emerald" />
                <MetricCard icon={<BellRing size={16} />} label="EVENTOS NÃO RECONHECIDOS" value={String(activeAlarms).padStart(2, "0")} detail="Requer atenção" tone={activeAlarms > 0 ? "rose" : "emerald"} />
              </div>
            </motion.section>

            <motion.div {...moduleReveal} id="simulation" data-bms-section className="mb-4 scroll-mt-24"><SimulationControls /></motion.div>

            <div className="grid gap-4 xl:grid-cols-12">
              <motion.section {...moduleReveal} id="hydraulic" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-7"><HydraulicPanel /></motion.section>
              <motion.section {...moduleReveal} id="fire" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-5"><FirePanel /></motion.section>
              <motion.section {...moduleReveal} id="gates" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-6"><GatePanel /></motion.section>
              <motion.section {...moduleReveal} id="elevators" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-6"><ElevatorPanel /></motion.section>
              <motion.section {...moduleReveal} id="energy" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-6"><LightingPanel /></motion.section>
              <motion.section {...moduleReveal} id="hvac" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-12"><HvacPanel /></motion.section>
              <motion.section {...moduleReveal} id="events" data-bms-section className="dashboard-module scroll-mt-24 xl:col-span-12"><EventLog /></motion.section>
            </div>

            <footer className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-white/[0.05] pt-4 text-[9px] text-slate-600">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="flex items-center gap-1.5"><Gauge size={12} />SENTINEL BMS <span className="mx-1 text-slate-700">·</span>SIMULAÇÃO LOCAL</p>
                <a href="https://github.com/alberto2santos" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition hover:text-slate-300"><Github size={12} />Alberto Luiz <span className="text-slate-500">@alberto2santos</span></a>
                <a href="mailto:alberto.dos.santos93@gmail.com" className="flex items-center gap-1.5 transition hover:text-slate-300"><Mail size={12} />alberto.dos.santos93@gmail.com</a>
              </div>
              <p className="flex items-center gap-1.5"><Activity size={11} className="text-emerald-400" />CICLO DE SUPERVISÃO 1s <span className="mx-1 text-slate-700">·</span>BUILDING AUTOMATION</p>
            </footer>
          </div>
        </main>
      </div>
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </div>
    </MotionConfig>
  );
}
