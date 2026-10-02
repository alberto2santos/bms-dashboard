"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertOctagon, Clock3, DoorOpen, Droplets, Flame, FlaskConical, RotateCcw, Settings2, X } from "lucide-react";
import { useBmsStore, type BmsSettings } from "@/store/useBmsStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass = "mt-1.5 block w-full rounded-lg border border-white/[0.08] bg-[#090e14] px-3 py-2.5 font-mono text-[12px] text-slate-100 outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10";

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  if (!open) return null;
  return <SettingsDialog onClose={onClose} />;
}

function SettingsDialog({ onClose }: Pick<SettingsModalProps, "onClose">) {
  const settings = useBmsStore((state) => state.settings);
  const updateSettings = useBmsStore((state) => state.updateSettings);
  const restoreSettingsInStore = useBmsStore((state) => state.restoreSettings);
  const emptyTank = useBmsStore((state) => state.emptyTankQuickly);
  const injectPumpFault = useBmsStore((state) => state.injectPumpFault);
  const triggerFire = useBmsStore((state) => state.triggerFireAlarm);
  const injectGateFault = useBmsStore((state) => state.injectGateStuckOpen);
  const operatorName = useBmsStore((state) => state.operatorName);
  const saveOperatorName = useBmsStore((state) => state.setOperatorName);
  const [draft, setDraft] = useState<BmsSettings>(settings);
  const [operatorDraft, setOperatorDraft] = useState(operatorName);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const change = <K extends keyof BmsSettings,>(key: K, value: BmsSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const restoreSettings = () => {
    restoreSettingsInStore();
    setDraft(useBmsStore.getState().settings);
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!Number.isFinite(draft.pumpStartLevel) || !Number.isFinite(draft.pumpStopLevel) || draft.pumpStartLevel < 0 || draft.pumpStartLevel > 95 || draft.pumpStopLevel < 5 || draft.pumpStopLevel > 100 || draft.pumpStopLevel <= draft.pumpStartLevel) {
      setError("O nível de desligamento deve ser maior que o nível de acionamento.");
      return;
    }
    if (!Number.isFinite(draft.pumpTimeoutSeconds) || draft.pumpTimeoutSeconds < 3 || draft.pumpTimeoutSeconds > 120) {
      setError("O timeout deve ficar entre 3 e 120 segundos.");
      return;
    }
    setError("");
    updateSettings(draft);
    saveOperatorName(operatorDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="glass-overlay max-h-[min(92vh,920px)] w-full max-w-3xl overflow-auto rounded-2xl border border-white/[0.1] shadow-[0_32px_100px_#000a]">
        <div className="glass-header sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-slate-900/80 px-5 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-300"><Settings2 size={17} /></div><div><p className="text-[9px] font-semibold tracking-[0.16em] text-slate-500">ENGINE DE CONFIGURAÇÃO</p><h2 id="settings-title" className="mt-1 text-[14px] font-semibold text-slate-100">Parâmetros do sistema</h2></div></div>
          <button type="button" onClick={onClose} aria-label="Fechar configurações" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"><X size={17} /></button>
        </div>

        <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sky-300"><Settings2 size={14} /><h3 className="text-[10px] font-bold tracking-[0.13em]">IDENTIFICAÇÃO DO OPERADOR</h3></div>
            <label className="block text-[10px] text-slate-400">Nome registrado nos eventos e comandos<input className={inputClass} type="text" maxLength={48} value={operatorDraft} onChange={(event) => setOperatorDraft(event.target.value)} placeholder="Nome do operador" /></label>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-cyan-200"><Droplets size={14} /><h3 className="text-[10px] font-bold tracking-[0.13em]">SETPOINTS HIDRÁULICOS</h3></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] text-slate-400">Ligar bomba · nível mínimo (%)<input className={inputClass} type="number" min={0} max={95} value={draft.pumpStartLevel} onChange={(event) => change("pumpStartLevel", Number(event.target.value))} /></label>
              <label className="text-[10px] text-slate-400">Desligar bomba · nível máximo (%)<input className={inputClass} type="number" min={5} max={100} value={draft.pumpStopLevel} onChange={(event) => change("pumpStopLevel", Number(event.target.value))} /></label>
              <label className="text-[10px] text-slate-400">Timeout sem progresso (s)<input className={inputClass} type="number" min={3} max={120} value={draft.pumpTimeoutSeconds} onChange={(event) => change("pumpTimeoutSeconds", Number(event.target.value))} /></label>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-amber-200"><Clock3 size={14} /><h3 className="text-[10px] font-bold tracking-[0.13em]">AGENDA · ILUMINAÇÃO EXTERNA</h3></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] text-slate-400">Ligar às<input className={inputClass} type="time" required value={draft.exteriorLightsOn} onChange={(event) => change("exteriorLightsOn", event.target.value)} /></label>
              <label className="text-[10px] text-slate-400">Desligar às<input className={inputClass} type="time" required value={draft.exteriorLightsOff} onChange={(event) => change("exteriorLightsOff", event.target.value)} /></label>
            </div>
            <p className="mt-2 text-[9px] text-slate-500">A agenda considera o horário local do navegador e aceita períodos que cruzam a meia-noite.</p>
          </section>

          <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-200"><FlaskConical size={14} /><h3 className="text-[10px] font-bold tracking-[0.13em]">DEV MODE · INJEÇÃO DE FALHAS</h3></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={emptyTank} className="flex min-h-12 items-center gap-3 rounded-lg border border-white/[0.07] bg-[#090e14]/70 px-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04] active:scale-[0.98]"><Droplets size={15} className="shrink-0 text-cyan-300" /><span><span className="block text-[10px] font-semibold text-slate-200">Esvaziar tanque rapidamente</span><span className="mt-0.5 block text-[9px] text-slate-500">Queda simulada por 45 segundos</span></span></button>
              <button type="button" onClick={injectPumpFault} className="flex min-h-12 items-center gap-3 rounded-lg border border-white/[0.07] bg-[#090e14]/70 px-3 text-left transition hover:border-rose-300/25 hover:bg-rose-300/[0.04] active:scale-[0.98]"><AlertOctagon size={15} className="shrink-0 text-rose-300" /><span><span className="block text-[10px] font-semibold text-slate-200">Travar bomba · Fault</span><span className="mt-0.5 block text-[9px] text-slate-500">Falha crítica e bloqueio do motor</span></span></button>
              <button type="button" onClick={() => triggerFire("zone-2")} className="flex min-h-12 items-center gap-3 rounded-lg border border-white/[0.07] bg-[#090e14]/70 px-3 text-left transition hover:border-rose-300/25 hover:bg-rose-300/[0.04] active:scale-[0.98]"><Flame size={15} className="shrink-0 text-rose-300" /><span><span className="block text-[10px] font-semibold text-slate-200">Incêndio · Zona 2</span><span className="mt-0.5 block text-[9px] text-slate-500">Alarme crítico + interlock de evacuação</span></span></button>
              <button type="button" onClick={injectGateFault} className="flex min-h-12 items-center gap-3 rounded-lg border border-white/[0.07] bg-[#090e14]/70 px-3 text-left transition hover:border-amber-300/25 hover:bg-amber-300/[0.04] active:scale-[0.98]"><DoorOpen size={15} className="shrink-0 text-amber-300" /><span><span className="block text-[10px] font-semibold text-slate-200">Travar portão aberto</span><span className="mt-0.5 block text-[9px] text-slate-500">Falha crítica com temporizador ativo</span></span></button>
            </div>
          </section>

          {error && <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-[10px] text-rose-200">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4"><button type="button" onClick={restoreSettings} className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[10px] font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"><RotateCcw size={12} />RESTAURAR PADRÕES</button><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.05]">Cancelar</button><button type="submit" className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.12] px-4 py-2.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-300/[0.2]">Aplicar parâmetros</button></div></div>
        </form>
      </section>
    </div>
  );
}
