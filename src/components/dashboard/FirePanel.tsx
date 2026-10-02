"use client";

import { useBmsStore } from "@/store/useBmsStore";
import { Flame, ShieldAlert, ShieldCheck } from "lucide-react";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { playAckTone } from "@/utils/audioAlert";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";

export function FirePanel() {
  const zones = useBmsStore((state) => state.fireZones);
  const interlock = useBmsStore((state) => state.fireInterlock);
  const acknowledgeZone = useBmsStore((state) => state.acknowledgeZone);
  const resetZone = useBmsStore((state) => state.resetFireZone);
  const lastUpdate = useBmsStore((state) => state.sensorUpdatedAt.fire);
  const connection = useBmsStore((state) => state.connection.status);
  const activeCount = zones.filter((zone) => zone.alarm).length;
  const muted = useBmsStore((state) => state.muted);

  return (
    <section className="panel-surface flex min-w-0 flex-col rounded-2xl p-5 sm:p-6">
      <PanelHeading
        icon={<Flame size={17} />}
        eyebrow="SEGURANÇA · DETECÇÃO DE INCÊNDIO"
        title="Painel de incêndio"
        info="Ao detectar incêndio, o interlock libera os portões para evacuação e bloqueia comandos de fechamento até que as zonas sejam reconhecidas e resetadas."
        action={<span className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold tracking-[0.11em] ${activeCount ? "bg-rose-400/[0.12] text-rose-300" : "bg-emerald-400/[0.08] text-emerald-300"}`}>{activeCount ? `${activeCount} ALARME${activeCount > 1 ? "S" : ""}` : "SISTEMA NORMAL"}</span>}
      />

      {interlock && <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-400/[0.07] px-3 py-2 text-[10px] font-medium text-rose-200"><ShieldAlert size={13} />Interlock ativo · portões mantidos abertos para evacuação</div>}

      <div className="mt-4 space-y-2">
        {zones.map((zone, index) => (
          <div key={zone.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${zone.alarm ? "border-rose-400/25 bg-rose-400/[0.055] fire-alarm-row" : "border-white/[0.055] bg-white/[0.018]"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${zone.alarm ? "bg-rose-400/[0.13] text-rose-300" : "bg-emerald-400/[0.08] text-emerald-300"}`}>{zone.alarm ? <Flame size={15} /> : <ShieldCheck size={15} />}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-200">{zone.name}</p>
                <p className={`mt-0.5 text-[9px] font-semibold tracking-[0.1em] ${zone.alarm ? "text-rose-300" : "text-emerald-300"}`}>{zone.alarm ? zone.acknowledged ? "ALARME · RECONHECIDO" : "ALARME ATIVO" : `ZONA 0${index + 1} · NORMAL`}</p>
              </div>
            </div>
            {zone.alarm && <div className="flex shrink-0 items-center gap-1.5">{!zone.acknowledged ? <button type="button" onClick={() => { acknowledgeZone(zone.id); if (!muted) void playAckTone(); }} className="rounded-md border border-rose-300/25 px-2.5 py-1.5 text-[9px] font-bold text-rose-200 transition hover:bg-rose-300/10 active:scale-95">ACK</button> : <button type="button" onClick={() => resetZone(zone.id)} className="rounded-md border border-white/10 px-2.5 py-1.5 text-[9px] font-bold text-slate-300 transition hover:bg-white/[0.06] active:scale-95">RESET</button>}</div>}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4"><p className="flex items-center gap-1.5 text-[9px] text-slate-500"><span className="size-1.5 rounded-full bg-emerald-400" />La detecção aciona abertura de portões e registro crítico automático.</p><SensorFreshness sensor="Central de incêndio" updatedAt={lastUpdate} connection={connection} compact /></div>
    </section>
  );
}
