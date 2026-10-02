"use client";

import { useMemo, useState } from "react";
import { Download, Lightbulb, Zap } from "lucide-react";
import { EnergyTrendChart } from "@/components/charts/EnergyTrendChart";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";
import { useBmsStore } from "@/store/useBmsStore";
import { downloadCsv } from "@/utils/exportCsv";
import { trendRanges, type TrendRangeKey } from "@/utils/trendRange";
import { playSwitchTone } from "@/utils/audioAlert";
import { useCurrentTime } from "@/hooks/useCurrentTime";

export function LightingPanel() {
  const lights = useBmsStore((state) => state.lights);
  const toggleLight = useBmsStore((state) => state.toggleLight);
  const energyKw = useBmsStore((state) => state.energyKw);
  const energyKwh = useBmsStore((state) => state.energyKwh);
  const history = useBmsStore((state) => state.energyHistory);
  const settings = useBmsStore((state) => state.settings);
  const lastUpdate = useBmsStore((state) => state.sensorUpdatedAt.energy);
  const connection = useBmsStore((state) => state.connection.status);
  const muted = useBmsStore((state) => state.muted);
  const [range, setRange] = useState<TrendRangeKey>("15m");
  const now = useCurrentTime(5_000);
  const filteredHistory = useMemo(() => history.filter((point) => point.timestamp >= now - trendRanges[range].milliseconds), [history, now, range]);
  const exportHistory = () => downloadCsv("sentinel-consumo-energia.csv", ["timestamp", "demanda_kw"], filteredHistory.map((point) => [new Date(point.timestamp).toISOString(), point.value]));

  return (
    <section className="panel-surface min-w-0 rounded-2xl p-5 sm:p-6">
      <PanelHeading icon={<Lightbulb size={17} />} eyebrow="ELÉTRICA · ILUMINAÇÃO & DEMANDA" title="Energia do edifício" action={<span className="flex items-center gap-1 rounded-full bg-sky-400/[0.08] px-2.5 py-1 text-[9px] font-semibold text-sky-400"><Zap size={10} />MONITORANDO</span>} />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/[0.05] bg-[#0a1017]/65 p-3"><p className="text-[9px] font-semibold tracking-[0.12em] text-slate-500">DEMANDA INSTANTÂNEA</p><p className="mt-1.5 font-mono text-[23px] font-semibold tracking-tight text-slate-100">{energyKw.toFixed(1)}<span className="ml-1 text-[11px] font-medium text-slate-400">kW</span></p></div>
        <div className="rounded-xl border border-white/[0.05] bg-[#0a1017]/65 p-3"><p className="text-[9px] font-semibold tracking-[0.12em] text-slate-500">ENERGIA ACUMULADA</p><p className="mt-1.5 font-mono text-[23px] font-semibold tracking-tight text-slate-100">{energyKwh.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className="ml-1 text-[11px] font-medium text-slate-400">kWh</span></p></div>
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.045] bg-[#0a1017]/55 px-2 pt-2"><div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-2"><div><p className="text-[9px] font-semibold tracking-[0.12em] text-slate-500">PERFIL DE DEMANDA</p><p className="mt-1 text-[9px] text-slate-500">Amostras a cada 5s</p></div><div className="flex items-center gap-1.5"><select aria-label="Período do histórico de energia" value={range} onChange={(event) => setRange(event.target.value as TrendRangeKey)} className="rounded-md border border-white/[0.08] bg-[#090e14] px-2 py-1.5 text-[9px] text-slate-300">{Object.entries(trendRanges).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><button type="button" onClick={exportHistory} title="Exportar histórico CSV" aria-label="Exportar consumo de energia em CSV" className="inline-flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.025] p-0 text-slate-400 hover:text-sky-400"><Download size={12} /></button></div></div><EnergyTrendChart data={filteredHistory} /></div>
      <div className="mt-4 flex items-center justify-between"><p className="text-[9px] font-semibold tracking-[0.13em] text-slate-500">CIRCUITOS DE ILUMINAÇÃO</p><span className="text-[8px] text-slate-500">{Object.values(lights).filter(Boolean).length}/{Object.keys(lights).length} ativos</span></div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Object.entries(lights).map(([zone, enabled]) => (
          <button key={zone} type="button" aria-pressed={enabled} onClick={() => { toggleLight(zone); if (!muted) void playSwitchTone(); }} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition active:scale-[0.98] ${enabled ? "border-amber-300/15 bg-amber-300/[0.045]" : "border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04]"}`}>
            <span className="min-w-0"><span className={`block truncate text-[10px] font-medium ${enabled ? "text-slate-200" : "text-slate-400"}`}>{zone}</span>{zone === "Externo" && <span className="mt-0.5 block text-[8px] text-slate-500">Agenda {settings.exteriorLightsOn}—{settings.exteriorLightsOff}</span>}</span>
            <span className={`relative ml-2 h-[17px] w-[30px] shrink-0 rounded-full transition ${enabled ? "bg-amber-300/55" : "bg-slate-700"}`}><span className={`absolute top-[2px] size-[13px] rounded-full bg-white transition ${enabled ? "left-[15px]" : "left-[2px]"}`} /></span>
          </button>
        ))}
      </div>
      <div className="mt-3"><SensorFreshness sensor="Demanda elétrica" updatedAt={lastUpdate} connection={connection} /></div>
    </section>
  );
}
