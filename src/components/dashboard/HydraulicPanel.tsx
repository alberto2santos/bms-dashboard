"use client";

import { useMemo, useState } from "react";
import { Download, Droplets, RotateCcw, Waves } from "lucide-react";
import { WaterTrendChart } from "@/components/charts/WaterTrendChart";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";
import { useBmsStore, type OperatingMode } from "@/store/useBmsStore";
import { downloadCsv } from "@/utils/exportCsv";
import { trendRanges, type TrendRangeKey } from "@/utils/trendRange";
import { useCurrentTime } from "@/hooks/useCurrentTime";

function TankGraphic({ level, flowing }: { level: number; flowing: boolean }) {
  const waterHeight = 1.47 * level;
  const waterTop = 178 - waterHeight;
  // Mantém a tubulação alinhada ao centro da saída do tanque e da bomba.
  const suctionPipe = "M 131 154 H 203";
  const dischargePipe = "M 247 154 H 287 Q 299 154 299 142 V 90 Q 299 78 311 78 H 319";
  const flowClass = flowing ? "hydraulic-pipe-flow-active animate-flow" : "";

  return (
    <svg viewBox="0 0 360 215" className="h-full w-full overflow-visible" role="img" aria-label={`Caixa d'água em ${level.toFixed(1)} por cento`}>
      <defs>
        <linearGradient id="tankWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06b6d4" stopOpacity=".66" /><stop offset="1" stopColor="#0e7490" stopOpacity=".35" /></linearGradient>
        <clipPath id="tankClip"><rect x="25" y="19" width="106" height="162" rx="14" /></clipPath>
      </defs>
      {[25, 50, 75, 100].map((tick) => <g key={tick}><line x1="17" x2="23" y1={178 - tick * 1.47} y2={178 - tick * 1.47} stroke="#64748b" strokeOpacity=".55" /><text x="2" y={182 - tick * 1.47} fill="#64748b" fontSize="9">{tick}</text></g>)}
      <g clipPath="url(#tankClip)">
        <rect x="25" y={waterTop} width="106" height={waterHeight + 4} fill="url(#tankWater)" className="water-fill" />
        <path d={`M 18 ${waterTop + 2} Q 45 ${waterTop - 4} 73 ${waterTop + 2} T 132 ${waterTop + 2} T 190 ${waterTop + 2} L 190 220 L 18 220 Z`} fill="#7dd3fc" fillOpacity=".2" className="wave-motion" />
      </g>
      <rect x="25" y="19" width="106" height="162" rx="14" fill="none" stroke="#94a3b8" strokeOpacity=".5" strokeWidth="1.4" />
      <path d="M 50 19 V 11 H 106 V 19" fill="none" stroke="#64748b" strokeOpacity=".6" strokeWidth="1.4" />
      <text x="78" y="199" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="1.1">RESERVATÓRIO A</text>
      <path d={suctionPipe} className="hydraulic-pipe-shell" />
      <path d={suctionPipe} className={`hydraulic-pipe-flow ${flowClass}`} />
      <circle cx="225" cy="154" r="22" fill="var(--bms-pump-bg)" stroke={flowing ? "#06b6d4" : "#475569"} strokeWidth="1.5" />
      <path d="M 216 145 L 234 154 L 216 163 Z" fill={flowing ? "#7dd3fc" : "#64748b"} />
      <path d={dischargePipe} className="hydraulic-pipe-shell" />
      <path d={dischargePipe} className={`hydraulic-pipe-flow ${flowClass}`} />
      <path d="M 319 69 L 332 78 L 319 87" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <text x="224" y="190" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="1">BOMBA P-01</text>
      <text x="302" y="62" textAnchor="middle" fill="#64748b" fontSize="9" letterSpacing="0.8">REDE PREDIAL</text>
    </svg>
  );
}

export function HydraulicPanel() {
  const level = useBmsStore((state) => state.tankLevel);
  const history = useBmsStore((state) => state.waterHistory);
  const pump = useBmsStore((state) => state.pump);
  const setPumpMode = useBmsStore((state) => state.setPumpMode);
  const toggleManualPump = useBmsStore((state) => state.toggleManualPump);
  const resetPumpFault = useBmsStore((state) => state.resetPumpFault);
  const settings = useBmsStore((state) => state.settings);
  const lastUpdate = useBmsStore((state) => state.sensorUpdatedAt.tankLevel);
  const connection = useBmsStore((state) => state.connection.status);
  const [range, setRange] = useState<TrendRangeKey>("15m");
  const now = useCurrentTime(5_000);
  const modes: OperatingMode[] = ["auto", "manual", "off"];
  const filteredHistory = useMemo(() => history.filter((point) => point.timestamp >= now - trendRanges[range].milliseconds), [history, now, range]);
  const exportHistory = () => downloadCsv("sentinel-nivel-reservatorio.csv", ["timestamp", "nivel_percentual"], filteredHistory.map((point) => [new Date(point.timestamp).toISOString(), point.value]));

  return (
    <section className="panel-surface min-w-0 rounded-2xl p-5 sm:p-6">
      <PanelHeading
        icon={<Droplets size={17} />}
        eyebrow="UTILIDADES · SISTEMA HIDRÁULICO"
        title="Reservatório & bombeamento"
        action={<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold tracking-[0.1em] ${pump.fault ? "border-rose-400/30 bg-rose-400/[0.09] text-rose-300" : pump.running ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300" : "border-slate-600/40 bg-white/[0.025] text-slate-400"}`}><span className={`size-1.5 rounded-full ${pump.fault ? "bg-rose-400 animate-pulse" : pump.running ? "bg-emerald-400" : "bg-slate-500"}`} />{pump.fault ? "FALHA" : pump.running ? "BOMBEANDO" : "EM ESPERA"}</span>}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-[274px] rounded-xl border border-white/[0.045] bg-[#0a1017]/70 px-3 py-2">
          <div className="grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 pt-1">
            <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold tracking-[0.1em] text-slate-500"><Waves size={13} className="shrink-0 text-cyan-300" /><span>NÍVEL ATUAL</span></div>
            <p className="text-right font-mono text-[25px] font-semibold leading-none tracking-tight text-slate-100">{level.toFixed(1)}<span className="ml-0.5 text-[14px] text-cyan-300">%</span></p>
            <p className="col-span-2 -mt-1 text-[9px] leading-snug text-slate-500">Liga bomba ≤ {settings.pumpStartLevel}% · desliga ≥ {settings.pumpStopLevel}%</p>
          </div>
          <div className="h-[198px]"><TankGraphic level={level} flowing={pump.running && !pump.fault} /></div>
        </div>
          <div className="min-w-0 rounded-xl border border-white/[0.045] bg-[#0a1017]/55 px-3 pt-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-2"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-slate-500">HISTÓRICO DO NÍVEL</p><p className="mt-1 text-[11px] text-slate-300">Amostras a cada 5s · segundos no eixo</p></div><div className="flex items-center gap-1.5"><select aria-label="Período do histórico de água" value={range} onChange={(event) => setRange(event.target.value as TrendRangeKey)} className="rounded-md border border-white/[0.08] bg-[#090e14] px-2 py-1.5 text-[9px] text-slate-300">{Object.entries(trendRanges).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select><button type="button" onClick={exportHistory} title="Exportar histórico CSV" aria-label="Exportar histórico de água em CSV" className="inline-flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.025] p-0 text-slate-400 hover:text-cyan-200"><Download size={12} /></button></div></div>
          <WaterTrendChart data={filteredHistory} />
        </div>
      </div>

      <div className="mt-4 flex flex-col justify-between gap-4 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${pump.fault ? "bg-rose-400 animate-pulse" : pump.running ? "bg-emerald-400 shadow-[0_0_9px_#34d39988]" : "bg-slate-600"}`} /><span className="text-[11px] font-medium text-slate-300">P-01 · {pump.fault ? "Falha detectada" : pump.running ? "Motor em operação" : "Motor parado"}</span></div>
          {pump.fault && <button type="button" onClick={resetPumpFault} className="flex items-center gap-1 text-[10px] font-semibold text-rose-300 hover:text-rose-200"><RotateCcw size={11} />RESET FAULT</button>}
          <span className="text-[10px] text-slate-500">Timeout {settings.pumpTimeoutSeconds}s</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.06] bg-[#090e14] p-1">
          {modes.map((mode) => <button key={mode} type="button" aria-pressed={pump.mode === mode} onClick={() => setPumpMode(mode)} className={`rounded-md px-3 py-1.5 text-[9px] font-bold tracking-[0.1em] transition ${pump.mode === mode ? "bg-cyan-300/[0.13] text-cyan-200 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>{mode.toUpperCase()}</button>)}
          {pump.mode === "manual" && <button type="button" disabled={pump.fault} onClick={toggleManualPump} className="ml-1 flex items-center gap-1 rounded-md border border-emerald-300/20 px-2.5 py-1.5 text-[9px] font-bold text-emerald-200 disabled:opacity-40">{pump.running ? "PARAR" : "LIGAR"}</button>}
        </div>
      </div>
      <div className="mt-3"><SensorFreshness sensor="Nível do reservatório" updatedAt={lastUpdate} connection={connection} /></div>
    </section>
  );
}
