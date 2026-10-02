import { describe, expect, it } from "vitest";
import { appendAlarm, summarizeAlarmFlood } from "@/services/alarmUtils";
import type { AlarmEvent } from "@/store/useBmsStore";

describe("appendAlarm", () => {
  it("retains at most 500 events with the newest first", () => {
    const existing = Array.from({ length: 500 }, (_, index): AlarmEvent => ({
      id: `event-${index}`,
      timestamp: index,
      source: "Teste",
      message: `Evento ${index}`,
      severity: "warning",
      status: "active",
    }));

    const result = appendAlarm(existing, "Teste", "Novo evento", "critical", 1_000);

    expect(result).toHaveLength(500);
    expect(result[0]).toMatchObject({ timestamp: 1_000, message: "Novo evento" });
    expect(result.at(-1)?.id).toBe("event-498");
    expect(existing).toHaveLength(500);
    expect(existing[0].id).toBe("event-0");
  });
});

describe("summarizeAlarmFlood", () => {
  it("counts warning and critical events in the rolling window and ranks sources", () => {
    const alarms: AlarmEvent[] = [
      { id: "new-a", timestamp: 999_950, source: "Bomba", message: "Falha", severity: "critical", status: "active" },
      { id: "new-b", timestamp: 999_900, source: "Bomba", message: "Sem progresso", severity: "warning", status: "active" },
      { id: "new-c", timestamp: 999_850, source: "Portão", message: "Aberto", severity: "warning", status: "active" },
      { id: "old", timestamp: 399, source: "Bomba", message: "Antigo", severity: "critical", status: "active" },
      { id: "info", timestamp: 999_999, source: "Operação", message: "ACK", severity: "info", status: "cleared" },
    ];

    expect(summarizeAlarmFlood(alarms, 1_000_000)).toEqual({
      count: 3,
      isFlood: false,
      topSources: [{ source: "Bomba", count: 2 }, { source: "Portão", count: 1 }],
    });
  });

  it("marks a flood at the configured threshold", () => {
    const alarms = Array.from({ length: 10 }, (_, index): AlarmEvent => ({
      id: `flood-${index}`,
      timestamp: 1_000 - index,
      source: "Bomba",
      message: "Alarme",
      severity: "warning",
      status: "active",
    }));

    expect(summarizeAlarmFlood(alarms, 1_000).isFlood).toBe(true);
  });
});