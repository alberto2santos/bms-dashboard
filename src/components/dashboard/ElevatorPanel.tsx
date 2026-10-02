"use client";

import { AlertTriangle, ArrowDown, ArrowUp, DoorClosed, DoorOpen, Gauge, Users } from "lucide-react";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { SensorFreshness } from "@/components/dashboard/SensorFreshness";
import { useBmsStore, type ElevatorUnit } from "@/store/useBmsStore";

function ElevatorCard({ elevator }: { elevator: ElevatorUnit }) {
  const maxFloor = 12;
  const currentFloor = Math.max(1, Math.min(maxFloor, elevator.currentFloor));
  // Converte os andares em uma escala de 0 a 100 para alinhar cabine e marcações.
  const floorProgress = ((currentFloor - 1) / (maxFloor - 1)) * 100;
  const capacityPercent = (elevator.passengers / elevator.capacity) * 100;
  const DirectionIcon = elevator.direction === "up" ? ArrowUp : elevator.direction === "down" ? ArrowDown : Gauge;
  const directionLabel = elevator.direction === "up" ? "Subindo" : elevator.direction === "down" ? "Descendo" : "Parado";
  const DoorIcon = elevator.door === "open" ? DoorOpen : DoorClosed;

  return (
    <article className="min-w-0 rounded-xl border border-white/[0.06] bg-[#0a1017]/65 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div><h3 className="text-[12px] font-semibold text-slate-100">{elevator.name}</h3><p className="mt-0.5 text-[9px] text-slate-500">Elevador social · 12 pavimentos</p></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold ${elevator.status === "moving" ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200" : "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"}`}><span className={`size-1.5 rounded-full ${elevator.status === "moving" ? "animate-pulse bg-cyan-300" : "bg-emerald-300"}`} />{elevator.status === "moving" ? "EM MOVIMENTO" : "EM ESPERA"}</span>
      </div>

      <div className="grid grid-cols-[66px_minmax(0,1fr)] gap-3.5">
        <div role="img" aria-label={`Poço do elevador, cabine no ${currentFloor}º andar`} className="relative h-[164px] overflow-hidden rounded-lg border border-white/[0.07] bg-[#080d13]">
          {/* A margem vertical mantém a cabine visível nos andares extremos. */}
          <div className="absolute inset-x-0 inset-y-[10px]">
            {Array.from({ length: maxFloor }, (_, index) => {
              const floor = index + 1;
              const floorPosition = (index / (maxFloor - 1)) * 100;
              return <div key={floor} className="absolute inset-x-0 flex h-4 translate-y-1/2 items-center" style={{ bottom: `${floorPosition}%` }}><span className="w-4 pl-1 text-[8px] leading-none text-slate-600">{floor}</span><span className="h-px flex-1 bg-white/[0.045]" /></div>;
            })}
            <div className="absolute left-[22px] z-10 flex h-5 w-8 translate-y-1/2 items-center justify-center rounded border border-cyan-300/40 bg-cyan-400/20 text-[8px] font-bold text-cyan-100 shadow-[0_0_16px_#06b6d422] transition-all duration-700" style={{ bottom: `${floorProgress}%` }}>{currentFloor}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between py-0.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/[0.045] bg-white/[0.02] px-2.5 py-2"><p className="text-[9px] text-slate-500">Andar atual</p><p className="mt-1 font-mono text-[19px] font-semibold leading-none tabular-nums text-slate-100">{elevator.currentFloor}<span className="ml-1 text-[9px] font-sans font-normal text-slate-500">º</span></p></div>
            <div className="rounded-lg border border-white/[0.045] bg-white/[0.02] px-2.5 py-2"><p className="text-[9px] text-slate-500">Destino</p><p className="mt-1 font-mono text-[19px] font-semibold leading-none tabular-nums text-slate-100">{elevator.destinationFloor}<span className="ml-1 text-[9px] font-sans font-normal text-slate-500">º</span></p></div>
          </div>
          <div className="flex items-center justify-between gap-2 py-2.5">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${elevator.status === "moving" ? "text-cyan-200" : "text-slate-400"}`}><DirectionIcon size={13} />{directionLabel}</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] ${elevator.door === "open" ? "text-amber-300" : "text-slate-400"}`}><DoorIcon size={13} />Portas {elevator.door === "open" ? "abertas" : "fechadas"}</span>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[9px]"><span className="inline-flex items-center gap-1.5 text-slate-500"><Users size={11} />Ocupação</span><span className="font-mono text-slate-300">{elevator.passengers}/{elevator.capacity}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full transition-[width] duration-700 ${capacityPercent >= 80 ? "bg-amber-400" : "bg-sky-400"}`} style={{ width: `${capacityPercent}%` }} /></div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ElevatorPanel() {
  const elevators = useBmsStore((state) => state.elevators);
  const fireInterlock = useBmsStore((state) => state.fireInterlock);
  const updatedAt = useBmsStore((state) => state.sensorUpdatedAt.elevators);
  const connection = useBmsStore((state) => state.connection.status);
  const moving = elevators.filter((elevator) => elevator.status === "moving").length;
  const capacity = elevators.reduce((sum, elevator) => sum + elevator.passengers, 0);
  const recallPending = elevators.filter((elevator) => elevator.currentFloor !== 1 || elevator.door !== "open").length;

  return (
    <section className="panel-surface flex min-w-0 flex-col rounded-2xl p-5 sm:p-6">
      <PanelHeading icon={<ArrowUp size={17} />} eyebrow="TRANSPORTE VERTICAL · MONITORAMENTO" title="Elevadores" action={<span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1 text-[9px] font-semibold text-cyan-200">{moving} EM MOVIMENTO</span>} />
      {fireInterlock && <div role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-rose-300/20 bg-rose-400/[0.07] px-3 py-2 text-[10px] font-medium text-rose-200"><AlertTriangle size={13} />{recallPending ? `Recall de emergência · ${recallPending} cabine${recallPending === 1 ? "" : "s"} retornando ao térreo.` : "Recall concluído · cabines retidas no térreo com portas abertas."}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500"><span>{elevators.length} cabines monitoradas</span><span>·</span><span>{capacity} passageiros a bordo</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{elevators.map((elevator) => <ElevatorCard key={elevator.id} elevator={elevator} />)}</div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3"><span className="text-[9px] text-slate-500">Posição, destino, direção, portas e carga de cada cabine.</span><SensorFreshness sensor="Elevadores" updatedAt={updatedAt} connection={connection} /></div>
    </section>
  );
}
