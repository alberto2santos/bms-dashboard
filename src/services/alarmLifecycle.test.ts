import { describe, expect, it } from "vitest";
import { countOutstandingAlarms, transitionAlarm } from "@/services/alarmLifecycle";
import type { AlarmEvent } from "@/store/useBmsStore";

const alarm: AlarmEvent = {
  id: "alarm-1",
  timestamp: 100,
  source: "Bomba hidráulica",
  message: "Falha de bombeamento",
  severity: "critical",
  status: "active",
};

describe("alarm lifecycle", () => {
  it("counts acknowledged alarms as outstanding until normalization", () => {
    const acknowledged = transitionAlarm(alarm, "acknowledge", "Operador", 200);
    const returned = transitionAlarm(alarm, "return-to-normal", "Sistema", 300);
    const cleared = transitionAlarm(acknowledged, "return-to-normal", "Sistema", 400);

    expect(countOutstandingAlarms([alarm, acknowledged, returned, cleared])).toBe(2);
  });

  it("acknowledges an active alarm without clearing it", () => {
    expect(transitionAlarm(alarm, "acknowledge", "Operador", 200)).toMatchObject({
      status: "ack",
      acknowledgedAt: 200,
      acknowledgedBy: "Operador",
    });
    expect(transitionAlarm(alarm, "acknowledge", "Operador", 200).clearedAt).toBeUndefined();
  });

  it("moves an unacknowledged alarm to returned and waits for ACK", () => {
    const returned = transitionAlarm(alarm, "return-to-normal", "Sistema", 300);
    expect(returned).toMatchObject({ status: "returned", normalizedAt: 300, normalizedBy: "Sistema" });

    expect(transitionAlarm(returned, "acknowledge", "Operador", 400)).toMatchObject({
      status: "cleared",
      acknowledgedAt: 400,
      normalizedAt: 300,
      normalizedBy: "Sistema",
      clearedBy: "Operador",
    });
  });

  it("clears an acknowledged alarm when it returns to normal", () => {
    const acknowledged = transitionAlarm(alarm, "acknowledge", "Operador", 200);
    expect(transitionAlarm(acknowledged, "return-to-normal", "Sistema", 300)).toMatchObject({
      status: "cleared",
      acknowledgedBy: "Operador",
      normalizedAt: 300,
      normalizedBy: "Sistema",
      clearedAt: 300,
    });
  });
});