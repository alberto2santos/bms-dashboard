import type { AlarmEvent } from "@/store/useBmsStore";

export type AlarmLifecycleAction = "acknowledge" | "return-to-normal";
export const ALARM_SHELVING_DURATIONS_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000] as const;

export function countOutstandingAlarms(alarms: readonly AlarmEvent[]): number {
  return alarms.filter((alarm) => alarm.status === "active" || alarm.status === "ack").length;
}

export function transitionAlarm(
  alarm: AlarmEvent,
  action: AlarmLifecycleAction,
  operator: string,
  timestamp: number,
): AlarmEvent {
  if (action === "acknowledge") {
    if (alarm.status === "active") {
      return { ...alarm, status: "ack", acknowledgedAt: timestamp, acknowledgedBy: operator };
    }
    if (alarm.status === "returned") {
      return {
        ...alarm,
        status: "cleared",
        acknowledgedAt: timestamp,
        acknowledgedBy: operator,
        clearedAt: timestamp,
        clearedBy: operator,
      };
    }
    return alarm;
  }

  if (alarm.status === "active") {
    return { ...alarm, status: "returned", normalizedAt: timestamp, normalizedBy: operator };
  }
  if (alarm.status === "ack") {
    return { ...alarm, status: "cleared", normalizedAt: timestamp, normalizedBy: operator, clearedAt: timestamp, clearedBy: operator };
  }
  return alarm;
}