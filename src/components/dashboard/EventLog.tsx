"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, CircleAlert, Clock3, Download, Info, ShieldAlert } from "lucide-react";
import { useBmsStore, type AlarmStatus, type Severity } from "@/store/useBmsStore";
import { PanelHeading } from "@/components/dashboard/PanelHeading";
import { downloadCsv } from "@/utils/exportCsv";
import { playAckTone } from "@/utils/audioAlert";
import { summarizeAlarmFlood } from "@/services/alarmUtils";
import { ALARM_SHELVING_DURATIONS_MS, countOutstandingAlarms } from "@/services/alarmLifecycle";

const statusLabel: Record<AlarmStatus, string> = { active: "Ativo · ACK pendente", ack: "Ativo · ACK", returned: "Normal · ACK pendente", cleared: "Normal · ACK" };
const inputClass = "rounded-lg border border-white/[0.08] bg-[#090e14] px-2.5 py-2 text-[9px] text-slate-300 outline-none focus:border-cyan-300/35";
const timestampLabel = (time: number) => new Date(time).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function EventLog() {
  const alarms = useBmsStore((state) => state.alarms);
  const acknowledge = useBmsStore((state) => state.acknowledgeAlarm);
  const shelve = useBmsStore((state) => state.shelveAlarm);
  const unshelve = useBmsStore((state) => state.unshelveAlarm);
  const muted = useBmsStore((state) => state.muted);
  const [statusFilter, setStatusFilter] = useState<"all" | AlarmStatus>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [now, setNow] = useState(0);
  const [shelvingAlarmId, setShelvingAlarmId] = useState("");
  const [shelvingReason, setShelvingReason] = useState("");
  const [shelvingDurationMs, setShelvingDurationMs] = useState<number>(ALARM_SHELVING_DURATIONS_MS[1]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);
  const visibleEvents = useMemo(() => {
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 59_999 : null;
    return alarms.filter((alarm) => (statusFilter === "all" || alarm.status === statusFilter)
      && (severityFilter === "all" || alarm.severity === severityFilter)
      && (from === null || alarm.timestamp >= from)
      && (to === null || alarm.timestamp <= to));
  }, [alarms, fromDate, toDate, statusFilter, severityFilter]);
  const floodSummary = useMemo(() => summarizeAlarmFlood(alarms, now), [alarms, now]);
  const shelvableAlarms = alarms.filter((alarm) => alarm.status === "active" || alarm.status === "ack");
  const shelvingTarget = shelvableAlarms.find((alarm) => alarm.id === shelvingAlarmId);
  const activeCount = countOutstandingAlarms(alarms);
  const activeCritical = alarms.find((alarm) => alarm.status === "active" && alarm.severity === "critical");
  const activeAlarm = activeCritical ?? alarms.find((alarm) => alarm.status === "active" || alarm.status === "ack" || alarm.status === "returned");
  const exportEvents = () => downloadCsv("sentinel-eventos-bms.csv", ["timestamp", "origem", "mensagem", "severidade", "status", "ack_por", "ack_em", "normalizado_por", "normalizado_em", "limpo_por", "limpo_em"], visibleEvents.map((alarm) => [
    new Date(alarm.timestamp).toISOString(), alarm.source, alarm.message, alarm.severity, alarm.status,
    alarm.acknowledgedBy ?? "", alarm.acknowledgedAt ? new Date(alarm.acknowledgedAt).toISOString() : "",
    alarm.normalizedBy ?? "",
    alarm.normalizedAt ? new Date(alarm.normalizedAt).toISOString() : "",
    alarm.clearedBy ?? "", alarm.clearedAt ? new Date(alarm.clearedAt).toISOString() : "",
  ]));

  return (
    <section className="panel-surface min-w-0 overflow-hidden rounded-2xl">
      <p className="sr-only" aria-live={activeCritical ? "assertive" : "polite"} aria-atomic="true">{activeAlarm ? `${activeAlarm.severity === "critical" ? "Alarme crítico" : "Alarme"}: ${activeAlarm.source}. ${activeAlarm.message}. ${statusLabel[activeAlarm.status]}.` : "Não há alarmes pendentes."}</p>
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <PanelHeading icon={<BellRing size={16} />} eyebrow="AUDITORIA · EVENTOS PERSISTIDOS" title="Central de alarmes & event log" action={<span className="ml-1 rounded-full bg-rose-400/[0.1] px-2.5 py-1 text-[9px] font-bold text-rose-300">{activeCount} ATIVOS</span>} />
        <button type="button" onClick={exportEvents} disabled={visibleEvents.length === 0} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[9px] font-semibold text-slate-300 transition hover:border-sky-400/25 hover:text-sky-400 disabled:opacity-40"><Download size={12} />EXPORTAR CSV</button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.055] px-5 py-2.5 text-[9px] sm:px-6">
        <span className="font-semibold text-slate-400">{floodSummary.count} ALARMES · 10 MIN</span>
        {floodSummary.isFlood && <span className="inline-flex items-center gap-1 font-bold text-rose-300"><CircleAlert size={11} />ALARM FLOOD</span>}
        <span className="text-slate-500">FONTES MAIS FREQUENTES</span>
        {floodSummary.topSources.length ? floodSummary.topSources.map(({ source, count }) => <span key={source} className="text-slate-300">{source} · {count}</span>) : <span className="text-slate-500">Nenhum alarme recente</span>}
      </div>

      <div role="group" aria-label="Shelving de alarmes" className="flex flex-wrap items-end gap-2 border-t border-white/[0.055] px-5 py-3 sm:px-6">
        <label className="text-[8px] font-semibold tracking-wider text-slate-500">ALARME<select aria-label="Alarme para shelving" value={shelvingAlarmId} onChange={(event) => setShelvingAlarmId(event.target.value)} className={`${inputClass} ml-2 max-w-[230px]`}><option value="">Selecionar alarme ativo</option>{shelvableAlarms.map((alarm) => <option key={alarm.id} value={alarm.id}>{alarm.source} · {alarm.message}</option>)}</select></label>
        <label className="text-[8px] font-semibold tracking-wider text-slate-500">PRAZO<select aria-label="Duração do shelving" value={shelvingDurationMs} onChange={(event) => setShelvingDurationMs(Number(event.target.value))} className={`${inputClass} ml-2`}><option value={ALARM_SHELVING_DURATIONS_MS[0]}>5 min</option><option value={ALARM_SHELVING_DURATIONS_MS[1]}>15 min</option><option value={ALARM_SHELVING_DURATIONS_MS[2]}>60 min</option></select></label>
        {!shelvingTarget?.shelvedUntil && <label className="min-w-40 flex-1 text-[8px] font-semibold tracking-wider text-slate-500">MOTIVO<input aria-label="Motivo do shelving" maxLength={120} value={shelvingReason} onChange={(event) => setShelvingReason(event.target.value)} placeholder="Ex.: manutenção programada" className={`${inputClass} ml-2 w-[calc(100%-0.5rem)]`} /></label>}
        {shelvingTarget?.shelvedUntil ? <button type="button" onClick={() => unshelve(shelvingTarget.id)} className="flex items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-[9px] font-bold text-amber-200 hover:bg-amber-300/[0.12]"><Clock3 size={12} />REMOVER SHELVING</button> : <button type="button" disabled={!shelvingTarget || !shelvingReason.trim()} onClick={() => shelvingTarget && shelve(shelvingTarget.id, shelvingReason, shelvingDurationMs)} className="flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-[9px] font-bold text-cyan-200 hover:bg-cyan-300/[0.12] disabled:opacity-40"><Clock3 size={12} />SHELVE ALARME</button>}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.055] px-5 py-3 sm:px-6">
        <label className="text-[8px] font-semibold tracking-wider text-slate-500" htmlFor="event-status">STATUS</label>
        <select id="event-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AlarmStatus)} className={inputClass}><option value="all">Todos</option><option value="active">Ativo · ACK pendente</option><option value="ack">Ativo · ACK</option><option value="returned">Normal · ACK pendente</option><option value="cleared">Normal · ACK</option></select>
        <label className="ml-1 text-[8px] font-semibold tracking-wider text-slate-500" htmlFor="event-severity">SEVERIDADE</label>
        <select id="event-severity" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "all" | Severity)} className={inputClass}><option value="all">Todas</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select>
        <label className="ml-1 text-[8px] font-semibold tracking-wider text-slate-500" htmlFor="event-from">DE</label><input id="event-from" aria-label="Data e hora inicial" type="datetime-local" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass} />
        <label className="text-[8px] font-semibold tracking-wider text-slate-500" htmlFor="event-to">ATÉ</label><input id="event-to" aria-label="Data e hora final" type="datetime-local" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass} />
        <span className="ml-auto text-[9px] text-slate-500">{visibleEvents.length} de {alarms.length} eventos</span>
      </div>

      <div className="max-h-[380px] overflow-auto border-t border-white/[0.055]">
        <table className="w-full min-w-[1030px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0c131c]">
            <tr className="border-b border-white/[0.055] text-[8px] font-semibold tracking-[0.15em] text-slate-500">
              <th className="px-5 py-3 font-semibold">TIMESTAMP</th><th className="px-4 py-3 font-semibold">ORIGEM</th><th className="px-4 py-3 font-semibold">MENSAGEM</th><th className="px-4 py-3 font-semibold">SEVERIDADE</th><th className="px-4 py-3 font-semibold">STATUS</th><th className="px-4 py-3 font-semibold">AUDITORIA ACK</th><th className="px-4 py-3 text-right font-semibold">AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => {
              const SeverityIcon = event.severity === "critical" ? ShieldAlert : event.severity === "warning" ? CircleAlert : Info;
              const severityClass = event.severity === "critical" ? "text-rose-300" : event.severity === "warning" ? "text-amber-300" : "text-sky-300";
              const audit = event.acknowledgedBy ? `${event.acknowledgedBy} · ${event.acknowledgedAt ? timestampLabel(event.acknowledgedAt) : ""}` : event.status === "active" || event.status === "returned" ? "Pendente" : "—";
              const statusTone = event.status === "active" ? "bg-rose-300/[0.1] text-rose-200" : event.status === "ack" ? "bg-amber-300/[0.09] text-amber-200" : event.status === "returned" ? "bg-sky-300/[0.09] text-sky-200" : "bg-slate-700/40 text-slate-400";
              return (
                <tr key={event.id} className="border-b border-white/[0.035] transition last:border-0 hover:bg-white/[0.018]">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-[9px] tabular-nums text-slate-400">{timestampLabel(event.timestamp)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[10px] font-medium text-slate-300">{event.source}</td>
                  <td className="max-w-[360px] px-4 py-3 text-[10px] leading-relaxed text-slate-400">{event.message}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-[9px] font-bold tracking-[0.08em] ${severityClass}`}><span className="inline-flex items-center gap-1.5"><SeverityIcon size={11} />{event.severity.toUpperCase()}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-[8px] font-bold tracking-[0.08em] ${statusTone}`}>{statusLabel[event.status].toUpperCase()}</span></td>
                  <td className="max-w-[180px] px-4 py-3 text-[9px] text-slate-400"><span className="block truncate">{audit}</span>{event.shelvedUntil && <span className="mt-1 block text-[8px] text-amber-200">Shelved até {timestampLabel(event.shelvedUntil)} · {event.shelvingReason}</span>}{event.normalizedAt && <span className="mt-1 block text-[8px] text-slate-500">Normalizado por {event.normalizedBy ?? "Sistema"} · {timestampLabel(event.normalizedAt)}</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{event.status === "active" || event.status === "returned" ? <button type="button" onClick={() => { acknowledge(event.id); if (!muted) void playAckTone(); }} className="inline-flex items-center gap-1 rounded-md border border-cyan-300/15 px-2 py-1 text-[8px] font-bold text-cyan-200 transition hover:bg-cyan-300/[0.08] active:scale-95"><Check size={10} />ACK</button> : event.status === "ack" ? <span className="text-[8px] text-amber-200/70">AGUARDANDO NORMALIZAÇÃO</span> : <span className="text-[9px] text-slate-600">—</span>}</td>
                </tr>
              );
            })}
            {visibleEvents.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-[11px] text-slate-500">Nenhum evento nesta visualização.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3 text-[9px] text-slate-500"><span>Retenção local persistida · {alarms.length} eventos</span><span className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />ATUALIZAÇÃO EM TEMPO REAL</span></div>
    </section>
  );
}
