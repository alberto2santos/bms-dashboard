"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Activity, BellOff, BellRing, CheckCheck, Menu, Moon, Settings2, Sun } from "lucide-react";
import { useBmsStore } from "@/store/useBmsStore";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { playAckTone } from "@/utils/audioAlert";

interface HeaderBarProps {
  onOpenSettings: () => void;
  onToggleNavigation: () => void;
  navigationOpen: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function HeaderBar({ onOpenSettings, onToggleNavigation, navigationOpen, theme, onToggleTheme }: HeaderBarProps) {
  const [now, setNow] = useState<Date | null>(null);
  const muted = useBmsStore((state) => state.muted);
  const setMuted = useBmsStore((state) => state.setMuted);
  const acknowledgeAll = useBmsStore((state) => state.acknowledgeAllAlarms);
  const connection = useBmsStore((state) => state.connection);
  const connectedAge = connection.lastMessageAt === null || now === null ? Infinity : Math.floor((now.getTime() - connection.lastMessageAt) / 1_000);
  const online = connection.status === "online" && connectedAge < 3;
  const warning = connection.status === "paused" || connection.status === "connecting" || (connection.status === "online" && connectedAge >= 3 && connectedAge < 10);
  const connectionLabel = connection.status === "paused" ? "SIMULAÇÃO PAUSADA" : online ? connection.source === "mock" ? "SIMULAÇÃO LOCAL" : "PLC ONLINE" : connection.status === "connecting" ? "CONECTANDO" : connection.status === "offline" ? "PLC OFFLINE" : connectedAge >= 10 ? "DADOS DESATUALIZADOS" : "SINAL ATRASADO";

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="glass-header sticky top-0 z-30 border-b border-white/[0.07] bg-slate-900/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-5 px-5 py-3.5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative size-10 shrink-0">
            <Image src="/favicon.svg" alt="" width={40} height={40} priority className="size-10 rounded-xl" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-cyan-300 ring-4 ring-[#090e14]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-wide text-slate-100">SENTINEL <span className="text-cyan-300">/ BMS</span></p>
            <p className="mt-0.5 hidden text-[10px] font-medium tracking-[0.12em] text-slate-500 md:block">BUILDING CONTROL SYSTEM</p>
          </div>
        </div>

        <div className="hidden items-center gap-7 2xl:flex">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2">
              {online && <span className={`absolute inline-flex size-full animate-ping rounded-full ${connection.source === "mock" ? "bg-sky-400" : "bg-emerald-400"} opacity-55`} />}
              <span className={`relative inline-flex size-2 rounded-full ${online ? connection.source === "mock" ? "bg-sky-400" : "bg-emerald-400" : warning ? "bg-amber-400" : "bg-rose-400"}`} />
            </span>
            <div>
              <p className={`text-[10px] font-bold tracking-[0.13em] ${online ? connection.source === "mock" ? "text-sky-400" : "text-emerald-300" : warning ? "text-amber-300" : "text-rose-300"}`}>{connectionLabel}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{connection.source === "mock" ? online ? `telemetria há ${connectedAge}s` : "fonte de dados: mock" : online ? "MQTT conectado" : "verifique o transporte"}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/[0.08]" />
          <WeatherWidget />
          <div className="h-8 w-px bg-white/[0.08]" />
          <div className="min-w-[116px] text-right tabular-nums">
            <p className="font-mono text-[17px] font-medium tracking-[0.04em] text-slate-100">{now?.toLocaleTimeString("pt-BR", { hour12: false }) ?? "--:--:--"}</p>
            <p className="mt-0.5 text-[10px] capitalize text-slate-500">{now?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }) ?? "Sincronizando relógio"}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition sm:px-3 ${muted ? "border-amber-400/25 bg-amber-300/[0.08] text-amber-200" : "border-white/[0.09] bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"}`}
            aria-label={muted ? "Ativar áudio" : "Silenciar alarmes"}
          >
            {muted ? <BellRing size={14} /> : <BellOff size={14} />}<span className="hidden sm:inline">{muted ? "ÁUDIO MUDO" : "MUTE ALL"}</span>
          </button>
          <button type="button" onClick={onToggleTheme} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={theme === "light"} title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} className="inline-flex size-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] text-amber-300 transition hover:border-white/20 hover:bg-white/[0.06]">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            onClick={() => { acknowledgeAll(); if (!muted) void playAckTone(); }}
            className="flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-200/40 hover:bg-cyan-300/[0.14] active:scale-95"
          >
            <CheckCheck size={14} /><span className="hidden sm:inline">ACK ALL</span><span className="sm:hidden">ACK</span>
          </button>
          <button type="button" onClick={onOpenSettings} className="ml-1 inline-flex size-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] text-slate-400 transition hover:border-white/20 hover:text-white" aria-label="Abrir configurações">
            <Settings2 size={17} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.04] px-5 py-2 2xl:hidden">
        <div title={connectionLabel} className={`flex min-w-0 flex-1 items-center gap-2 truncate text-[10px] font-bold tracking-wider ${online ? connection.source === "mock" ? "text-sky-400" : "text-emerald-300" : warning ? "text-amber-300" : "text-rose-300"}`}><Activity size={12} className="shrink-0" /><span className="truncate">{connectionLabel}</span></div>
        <div className="flex shrink-0 items-center gap-2.5"><div className="whitespace-nowrap text-right font-mono text-[11px] text-slate-300">{now?.toLocaleTimeString("pt-BR", { hour12: false }) ?? "--:--:--"}<span className="ml-1 hidden font-sans text-slate-500 sm:inline">· {now?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></div><WeatherWidget compact className="2xl:hidden" /><button type="button" onClick={onToggleNavigation} aria-controls="sidebar-navigation" aria-expanded={navigationOpen} aria-label={navigationOpen ? "Fechar navegação por seção" : "Abrir navegação por seção"} className="inline-flex size-10 items-center justify-center rounded-md border border-white/[0.09] bg-white/[0.025] text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-200 lg:hidden"><Menu size={15} /></button></div>
      </div>
    </header>
  );
}
