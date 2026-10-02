"use client";

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, DoorOpen, RotateCcw, Square } from "lucide-react";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { useBmsStore } from "@/store/useBmsStore";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";
import { useCurrentTime } from "@/hooks/useCurrentTime";

const gateLabels = { closed: "Fechado", opening: "Abrindo", open: "Aberto", closing: "Fechando", stopped: "Parado" };

export function GatePanel() {
  const gate = useBmsStore((state) => state.gate);
  const fireInterlock = useBmsStore((state) => state.fireInterlock);
  const commandGate = useBmsStore((state) => state.commandGate);
  const resetGateFault = useBmsStore((state) => state.resetGateFault);
  const lastUpdate = useBmsStore((state) => state.sensorUpdatedAt.gate);
  const connection = useBmsStore((state) => state.connection.status);
  const now = useCurrentTime(1_000);

  const openForSeconds = gate.openSince === null ? 0 : Math.max(0, Math.floor((now - gate.openSince) / 1_000));
  const elapsed = `${String(Math.floor(openForSeconds / 60)).padStart(2, "0")}:${String(openForSeconds % 60).padStart(2, "0")}`;
  const statusClass = gate.status === "open" || gate.status === "opening" ? "text-amber-200" : gate.status === "closing" ? "text-cyan-200" : "text-slate-300";

  return (
    <section className="panel-surface flex min-w-0 flex-col rounded-2xl p-5 sm:p-6">
      <PanelHeading icon={<DoorOpen size={17} />} eyebrow="ACESSO · PORTÃO PRINCIPAL" title="Portões automáticos" action={<span className={`rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] ${statusClass}`}>{gateLabels[gate.status].toUpperCase()}</span>} />
      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/[0.05] bg-[#0a1017]/60 p-4">
        <div>
          <div className="flex items-center gap-2"><div className={`flex size-9 items-center justify-center rounded-lg ${gate.stuckOpen ? "bg-rose-400/[0.1] text-rose-300" : "bg-amber-300/[0.08] text-amber-200"}`}><DoorOpen size={17} /></div><div><p className="text-[11px] font-semibold text-slate-200">Acesso veicular · G-01</p><p className="mt-1 text-[9px] text-slate-500">Motor monofásico · fotocélula ativa</p></div></div>
          {gate.stuckOpen && <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-rose-300"><AlertTriangle size={11} />FALHA · TRAVADO ABERTO</p>}
          {fireInterlock && <p className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-rose-300"><AlertTriangle size={11} />INTERLOCK DE EVACUAÇÃO ATIVO</p>}
        </div>
        <div className="min-w-[84px] text-right"><p className="font-mono text-[21px] font-semibold tabular-nums text-slate-100">{elapsed}</p><p className={`mt-1 text-[8px] font-semibold tracking-[0.12em] ${openForSeconds >= 270 ? "text-amber-300" : "text-slate-500"}`}>TEMPO ABERTO</p></div>
      </div>
      {openForSeconds >= 300 && gate.status === "open" && <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[10px] text-amber-200"><AlertTriangle size={13} />Atenção: portão aberto há mais de 5 minutos.</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => commandGate("open")} disabled={gate.status === "open" || gate.status === "opening"} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-2 py-2.5 text-[9px] font-bold tracking-[0.06em] text-emerald-200 transition hover:bg-emerald-300/[0.13] active:scale-95 disabled:opacity-35"><ArrowUpFromLine size={13} />ABRIR</button>
        <button type="button" onClick={() => commandGate("stop")} disabled={gate.status !== "opening" && gate.status !== "closing"} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.09] bg-white/[0.025] px-2 py-2.5 text-[9px] font-bold tracking-[0.06em] text-slate-300 transition hover:bg-white/[0.07] active:scale-95 disabled:opacity-35"><Square size={12} />PARAR</button>
        <button type="button" onClick={() => commandGate("close")} disabled={gate.status === "closed" || gate.status === "closing" || fireInterlock || gate.stuckOpen} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300/20 bg-rose-300/[0.055] px-2 py-2.5 text-[9px] font-bold tracking-[0.06em] text-rose-200 transition hover:bg-rose-300/[0.11] active:scale-95 disabled:opacity-35"><ArrowDownToLine size={13} />FECHAR</button>
      </div>
      {gate.stuckOpen && <button type="button" onClick={resetGateFault} className="mt-3 flex items-center gap-1.5 text-[9px] font-semibold text-rose-300 hover:text-rose-200"><RotateCcw size={11} />RESETAR FALHA DO PORTÃO</button>}
      {fireInterlock && <p className="mt-3 text-[9px] text-slate-500">Comando de fechamento bloqueado pelo interlock de incêndio.</p>}
      <div className="mt-auto pt-3"><SensorFreshness sensor="Portão G-01" updatedAt={lastUpdate} connection={connection} compact /></div>
    </section>
  );
}
