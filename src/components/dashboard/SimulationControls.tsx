"use client";

import { Pause, Play, RotateCcw, RadioTower } from "lucide-react";
import { useBmsStore } from "@/store/useBmsStore";

type Scenario = "normal" | "low-water" | "pump-fault" | "fire" | "gate-stuck" | "demand-peak";

export function SimulationControls() {
  const simulation = useBmsStore((state) => state.simulation);
  const setRunning = useBmsStore((state) => state.setSimulationRunning);
  const setSpeed = useBmsStore((state) => state.setSimulationSpeed);
  const setScenario = useBmsStore((state) => state.setScenario);
  const activatePeakDemand = useBmsStore((state) => state.activatePeakDemandScenario);
  const setTankLevel = useBmsStore((state) => state.setScenarioTankLevel);
  const resetDemo = useBmsStore((state) => state.resetDemo);
  const injectPumpFault = useBmsStore((state) => state.injectPumpFault);
  const triggerFireAlarm = useBmsStore((state) => state.triggerFireAlarm);
  const injectGateFault = useBmsStore((state) => state.injectGateStuckOpen);

  const runScenario = (scenario: Scenario) => {
    resetDemo();
    switch (scenario) {
      case "low-water": setTankLevel(16); break;
      case "pump-fault": injectPumpFault(); setScenario("Falha da bomba"); break;
      case "fire": triggerFireAlarm("zone-2"); setScenario("Incêndio na garagem"); break;
      case "gate-stuck": injectGateFault(); setScenario("Portão travado aberto"); break;
      case "demand-peak": activatePeakDemand(); break;
      default: break;
    }
  };

  const selectedScenario: Scenario = simulation.scenario === "Nível baixo de água" ? "low-water"
    : simulation.scenario === "Falha da bomba" ? "pump-fault"
      : simulation.scenario === "Incêndio na garagem" ? "fire"
          : simulation.scenario === "Portão travado aberto" ? "gate-stuck"
            : simulation.scenario === "Pico de demanda" ? "demand-peak" : "normal";

  return (
    <section className="panel-surface flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-300"><RadioTower size={15} /></div>
        <div className="min-w-0"><p className="text-[9px] font-bold tracking-[0.14em] text-slate-400">SIMULADOR DE CENÁRIOS</p><p className="mt-1 truncate text-[10px] text-slate-200">{simulation.scenario}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="scenario-select">Selecionar cenário</label>
        <select id="scenario-select" value={selectedScenario} onChange={(event) => runScenario(event.target.value as Scenario)} className="max-w-[170px] rounded-lg border border-white/[0.09] bg-[#090e14] px-2.5 py-2 text-[9px] text-slate-200 outline-none focus:border-cyan-300/35">
          <option value="normal">Operação normal</option><option value="low-water">Nível baixo de água</option><option value="pump-fault">Falha da bomba</option><option value="fire">Incêndio na garagem</option><option value="gate-stuck">Portão travado aberto</option><option value="demand-peak">Pico de demanda</option>
        </select>
        <label className="sr-only" htmlFor="simulation-speed">Velocidade</label>
        <select id="simulation-speed" value={simulation.speed} onChange={(event) => setSpeed(Number(event.target.value))} className="rounded-lg border border-white/[0.09] bg-[#090e14] px-2.5 py-2 text-[9px] text-slate-200 outline-none focus:border-cyan-300/35"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select>
        <button type="button" onClick={() => setRunning(!simulation.running)} className="flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-2 text-[9px] font-bold text-cyan-200 transition hover:bg-cyan-300/[0.14]">{simulation.running ? <Pause size={12} /> : <Play size={12} />}{simulation.running ? "PAUSAR" : "RETOMAR"}</button>
        <button type="button" onClick={() => runScenario("normal")} aria-label="Reiniciar cenário" title="Reiniciar cenário" className="inline-flex size-10 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.025] p-0 text-slate-400 transition hover:bg-white/[0.07] hover:text-slate-100"><RotateCcw size={13} /></button>
      </div>
    </section>
  );
}
