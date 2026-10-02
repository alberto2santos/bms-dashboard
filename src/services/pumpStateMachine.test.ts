import { describe, expect, it } from "vitest";
import { transitionPump, type PumpMachineState } from "@/services/pumpStateMachine";

const stoppedAutoPump: PumpMachineState = {
  mode: "auto",
  running: false,
  fault: false,
  runSeconds: 0,
  noProgressSeconds: 0,
};

describe("pump state machine", () => {
  it("starts and stops automatically at the configured thresholds", () => {
    const running = transitionPump(stoppedAutoPump, { type: "evaluate", tankLevel: 28, startLevel: 28, stopLevel: 84 });
    const stopped = transitionPump({ ...running, running: true }, { type: "evaluate", tankLevel: 84, startLevel: 28, stopLevel: 84 });

    expect(running.running).toBe(true);
    expect(stopped.running).toBe(false);
  });

  it("allows manual toggles only in manual mode and without a latched fault", () => {
    expect(transitionPump({ ...stoppedAutoPump, mode: "manual" }, { type: "toggle-manual" }).running).toBe(true);
    expect(transitionPump(stoppedAutoPump, { type: "toggle-manual" })).toBe(stoppedAutoPump);
    expect(transitionPump({ ...stoppedAutoPump, mode: "manual", fault: true }, { type: "toggle-manual" }).running).toBe(false);
  });

  it("latches faults, stops the pump, and requires an explicit reset", () => {
    const running = { ...stoppedAutoPump, running: true, noProgressSeconds: 18 };
    const faulted = transitionPump(running, { type: "latch-fault" });

    expect(faulted).toMatchObject({ running: false, fault: true, noProgressSeconds: 0 });
    expect(transitionPump(faulted, { type: "reset-fault" })).toMatchObject({ running: false, fault: false });
  });

  it("stops a running pump when switched off", () => {
    const running = { ...stoppedAutoPump, mode: "manual" as const, running: true };
    expect(transitionPump(running, { type: "set-mode", mode: "off" })).toMatchObject({ mode: "off", running: false });
  });
});