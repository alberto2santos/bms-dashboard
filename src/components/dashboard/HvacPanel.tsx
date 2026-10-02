"use client";

import { Fan, Minus, Plus, Thermometer, Users, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";
import { useBmsStore, type HvacMode } from "@/store/useBmsStore";

const modes: HvacMode[] = ["auto", "manual", "off"];

export function HvacPanel() {
  const hvac = useBmsStore((state) => state.hvac);
  const lastUpdate = useBmsStore((state) => state.sensorUpdatedAt.indoorAir);
  const connection = useBmsStore((state) => state.connection.status);
  const setMode = useBmsStore((state) => state.setHvacMode);
  const adjustSetpoint = useBmsStore((state) => state.adjustHvacSetpoint);

  return (
    <section className="panel-surface min-w-0 rounded-2xl p-5 sm:p-6">
      <PanelHeading icon={<Fan size={17} />} eyebrow="CLIMATIZAÇÃO · QUALIDADE DO AR" title="HVAC · Zona comum" action={<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold tracking-[0.09em] ${hvac.running ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300" : "border-slate-600/40 bg-white/[0.025] text-slate-400"}`}><span className={`size-1.5 rounded-full ${hvac.running ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} />{hvac.running ? "VENTILAÇÃO ATIVA" : "EM ESPERA"}</span>} />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric icon={<Thermometer size={14} />} label="TEMPERATURA" value={`${hvac.indoorTemperature.toFixed(1)}°C`} />
        <Metric icon={<Wind size={14} />} label="UMIDADE" value={`${hvac.humidity.toFixed(0)}%`} />
        <Metric icon={<Wind size={14} />} label="CO₂" value={`${hvac.co2Ppm} ppm`} alert={hvac.co2Ppm > 1_000} />
        <Metric icon={<Users size={14} />} label="OCUPAÇÃO" value={`${hvac.occupancy} pessoas`} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2"><span className="text-[9px] font-semibold tracking-[0.1em] text-slate-500">SETPOINT</span><div className="flex items-center rounded-lg border border-white/[0.07] bg-[#090e14] p-1"><button type="button" onClick={() => adjustSetpoint(-0.5)} aria-label="Diminuir setpoint" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white"><Minus size={12} /></button><span className="min-w-[55px] text-center font-mono text-[12px] font-semibold text-slate-100">{hvac.setpoint.toFixed(1)}°C</span><button type="button" onClick={() => adjustSetpoint(0.5)} aria-label="Aumentar setpoint" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white"><Plus size={12} /></button></div></div>
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#090e14] p-1">{modes.map((mode) => <button key={mode} type="button" aria-pressed={hvac.mode === mode} onClick={() => setMode(mode)} className={`rounded-md px-3 py-1.5 text-[9px] font-bold tracking-[0.1em] transition ${hvac.mode === mode ? "bg-cyan-300/[0.13] text-cyan-200" : "text-slate-500 hover:text-slate-300"}`}>{mode.toUpperCase()}</button>)}</div>
      </div>
      <div className="mt-3"><SensorFreshness sensor="Qualidade do ar" updatedAt={lastUpdate} connection={connection} /></div>
    </section>
  );
}

function Metric({ icon, label, value, alert = false }: { icon: ReactNode; label: string; value: string; alert?: boolean }) {
  return <div className="rounded-xl border border-white/[0.05] bg-[#0a1017]/60 p-3"><p className="flex items-center gap-1.5 text-[8px] font-semibold tracking-[0.1em] text-slate-500">{icon}{label}</p><p className={`mt-2 font-mono text-[17px] font-semibold tracking-tight ${alert ? "text-amber-300" : "text-slate-100"}`}>{value}</p></div>;
}
