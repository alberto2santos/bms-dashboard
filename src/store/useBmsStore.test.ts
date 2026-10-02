import { beforeEach, describe, expect, it } from "vitest";
import { useBmsStore } from "@/store/useBmsStore";

describe("fire interlock and alarm acknowledgement", () => {
  beforeEach(() => {
    useBmsStore.setState(useBmsStore.getInitialState(), true);
  });

  it("opens the gate and keeps the interlock after ACK until the fire is reset", () => {
    useBmsStore.getState().triggerFireAlarm("zone-2");
    const fireAlarm = useBmsStore.getState().alarms.find((alarm) => alarm.source === "Incêndio · Garagem");

    expect(useBmsStore.getState().gate.status).toBe("open");
    expect(useBmsStore.getState().fireInterlock).toBe(true);
    expect(useBmsStore.getState().elevators.every((elevator) => elevator.destinationFloor === 1 && (elevator.currentFloor === 1 ? elevator.door === "open" : elevator.direction === "down"))).toBe(true);
    expect(fireAlarm?.status).toBe("active");

    useBmsStore.getState().acknowledgeAlarm(fireAlarm!.id);

    const acknowledgedAlarm = useBmsStore.getState().alarms.find((alarm) => alarm.id === fireAlarm!.id);
    expect(acknowledgedAlarm?.status).toBe("ack");
    expect(acknowledgedAlarm?.clearedAt).toBeUndefined();
    expect(useBmsStore.getState().fireZones.find((zone) => zone.id === "zone-2")?.alarm).toBe(true);
    expect(useBmsStore.getState().fireInterlock).toBe(true);
  });

  it("allows the gate to close after the last acknowledged fire zone is reset", () => {
    useBmsStore.getState().triggerFireAlarm("zone-2");
    useBmsStore.getState().acknowledgeZone("zone-2");
    useBmsStore.getState().resetFireZone("zone-2");

    expect(useBmsStore.getState().fireInterlock).toBe(false);
    expect(useBmsStore.getState().fireZones.find((zone) => zone.id === "zone-2")?.alarm).toBe(false);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.source === "Incêndio · Garagem")?.status).toBe("cleared");

    useBmsStore.getState().commandGate("close");
    expect(useBmsStore.getState().gate.status).toBe("closing");
  });
});

describe("settings defaults", () => {
  beforeEach(() => {
    useBmsStore.setState(useBmsStore.getInitialState(), true);
  });

  it("restores default settings and records the operator action", () => {
    useBmsStore.setState({ settings: { ...useBmsStore.getState().settings, pumpStartLevel: 10 } });

    useBmsStore.getState().restoreSettings();

    expect(useBmsStore.getState().settings.pumpStartLevel).toBe(28);
    expect(useBmsStore.getState().alarms[0].message).toContain("restaurados aos padrões");
  });
});

describe("alarm clearing and command audit", () => {
  beforeEach(() => {
    useBmsStore.setState(useBmsStore.getInitialState(), true);
  });

  it("keeps an acknowledged fault active until its equipment is reset", () => {
    useBmsStore.getState().injectPumpFault();
    const alarmId = useBmsStore.getState().alarms[0].id;

    useBmsStore.getState().acknowledgeAlarm(alarmId);
    expect(useBmsStore.getState().alarms[0].status).toBe("ack");
    expect(useBmsStore.getState().alarms[0].clearedAt).toBeUndefined();

    useBmsStore.getState().resetPumpFault();
    const clearedAlarm = useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId);
    expect(clearedAlarm).toMatchObject({ status: "cleared", clearedBy: "Operador Sentinel" });
    expect(clearedAlarm?.clearedAt).toBeTypeOf("number");
  });

  it("requires ACK after an unacknowledged fault returns to normal", () => {
    useBmsStore.getState().injectPumpFault();
    useBmsStore.getState().resetPumpFault();
    const returnedAlarm = useBmsStore.getState().alarms.find((alarm) => alarm.severity === "critical");

    expect(returnedAlarm?.status).toBe("returned");
    useBmsStore.getState().acknowledgeAlarm(returnedAlarm!.id);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === returnedAlarm!.id)?.status).toBe("cleared");
  });

  it("moves an unacknowledged gate fault to returned when it is reset", () => {
    useBmsStore.getState().injectGateStuckOpen();
    const gateFault = useBmsStore.getState().alarms.find((alarm) => alarm.severity === "critical");

    useBmsStore.getState().resetGateFault();

    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === gateFault!.id)?.status).toBe("returned");
  });

  it("records simulation and HVAC commands with the operator", () => {
    useBmsStore.getState().setSimulationRunning(false);
    useBmsStore.getState().setSimulationSpeed(2);
    useBmsStore.getState().setHvacMode("manual");
    useBmsStore.getState().adjustHvacSetpoint(0.5);

    const auditMessages = useBmsStore.getState().alarms.map((alarm) => alarm.message);
    expect(auditMessages).toEqual(expect.arrayContaining([
      expect.stringContaining("pausada por Operador Sentinel"),
      expect.stringContaining("alterada para 2× por Operador Sentinel"),
      expect.stringContaining("Modo alterado para MANUAL por Operador Sentinel"),
      expect.stringContaining("Setpoint ajustado para 23.0 °C por Operador Sentinel"),
    ]));
  });
});

describe("guided peak demand scenario", () => {
  beforeEach(() => {
    useBmsStore.setState(useBmsStore.getInitialState(), true);
  });

  it("turns on every lighting circuit and records who started the scenario", () => {
    useBmsStore.getState().activatePeakDemandScenario();

    expect(Object.values(useBmsStore.getState().lights).every(Boolean)).toBe(true);
    expect(useBmsStore.getState().simulation.scenario).toBe("Pico de demanda");
    expect(useBmsStore.getState().alarms[0].message).toContain("iniciado por Operador Sentinel");
  });
});

describe("alarm shelving", () => {
  beforeEach(() => {
    useBmsStore.setState(useBmsStore.getInitialState(), true);
  });

  it("requires a reason and only accepts supported durations", () => {
    useBmsStore.getState().injectPumpFault();
    const alarmId = useBmsStore.getState().alarms[0].id;

    useBmsStore.getState().shelveAlarm(alarmId, "   ", 5 * 60_000);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)?.shelvedUntil).toBeUndefined();

    useBmsStore.getState().shelveAlarm(alarmId, "Manutenção", 7 * 60_000);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)?.shelvedUntil).toBeUndefined();
  });

  it("records shelving and allows manual removal", () => {
    useBmsStore.getState().injectPumpFault();
    const alarmId = useBmsStore.getState().alarms[0].id;
    const start = Date.now();

    useBmsStore.getState().shelveAlarm(alarmId, "Manutenção programada", 5 * 60_000);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)).toMatchObject({
      shelvingReason: "Manutenção programada",
      shelvedBy: "Operador Sentinel",
      shelvedUntil: start + 5 * 60_000,
      status: "active",
    });

    useBmsStore.getState().unshelveAlarm(alarmId);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)?.shelvedUntil).toBeUndefined();
  });

  it("expires shelving and records an audit event", () => {
    useBmsStore.getState().injectPumpFault();
    const alarmId = useBmsStore.getState().alarms[0].id;
    useBmsStore.getState().shelveAlarm(alarmId, "Teste de expiração", 5 * 60_000);
    const expiresAt = useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)!.shelvedUntil!;
    expect(expiresAt).toBeTypeOf("number");
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(useBmsStore.getState().alarms.filter((alarm) => alarm.shelvedUntil !== undefined && alarm.shelvedUntil <= expiresAt + 1)).toHaveLength(1);
    useBmsStore.getState().expireShelvedAlarms(expiresAt + 1);
    expect(useBmsStore.getState().alarms.find((alarm) => alarm.id === alarmId)?.shelvedUntil).toBeUndefined();
    expect(useBmsStore.getState().alarms[0].message).toContain("Silenciamento expirou");
  });
});