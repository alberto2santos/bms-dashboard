import type { AlarmEvent, Severity } from "@/store/useBmsStore";

export const ALARM_FLOOD_WINDOW_MS = 10 * 60_000;
export const ALARM_FLOOD_THRESHOLD = 10;

export interface AlarmFloodSummary {
  count: number;
  isFlood: boolean;
  topSources: Array<{ source: string; count: number }>;
}

export function summarizeAlarmFlood(alarms: AlarmEvent[], now: number, limit = 3): AlarmFloodSummary {
  const recent = alarms.filter((alarm) => alarm.severity !== "info"
    && alarm.timestamp >= now - ALARM_FLOOD_WINDOW_MS
    && alarm.timestamp <= now);
  const sourceCounts = new Map<string, number>();
  for (const alarm of recent) sourceCounts.set(alarm.source, (sourceCounts.get(alarm.source) ?? 0) + 1);

  const topSources = Array.from(sourceCounts, ([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count || left.source.localeCompare(right.source, "pt-BR"))
    .slice(0, limit);

  return { count: recent.length, isFlood: recent.length >= ALARM_FLOOD_THRESHOLD, topSources };
}

export function appendAlarm(
  alarms: AlarmEvent[],
  source: string,
  message: string,
  severity: Severity,
  timestamp = Date.now(),
): AlarmEvent[] {
  const event: AlarmEvent = {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    source,
    message,
    severity,
    status: severity === "info" ? "cleared" : "active",
  };
  return [event, ...alarms].slice(0, 500);
}
