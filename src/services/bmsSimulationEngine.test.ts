import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calculateBmsStep } from "@/services/bmsSimulationEngine";
import { useBmsStore } from "@/store/useBmsStore";

describe("calculateBmsStep", () => {
  it("returns a new simulated step without mutating its input state", () => {
    const initial = useBmsStore.getInitialState();
    const state = { ...initial, connection: { ...initial.connection, lastMessageAt: initial.lastTrendAt } };
    const originalLevel = state.tankLevel;
    const originalHistoryLength = state.waterHistory.length;
    const next = calculateBmsStep(state, state.lastTrendAt + 5_000);

    expect(next.tankLevel).toBeLessThan(originalLevel);
    expect(next.waterHistory).toHaveLength(originalHistoryLength + 1);
    expect(state.tankLevel).toBe(originalLevel);
    expect(state.waterHistory).toHaveLength(originalHistoryLength);
  });

  it("advances process values by elapsed time and configured simulation speed", () => {
    const initial = useBmsStore.getInitialState();
    const state = { ...initial, connection: { ...initial.connection, lastMessageAt: initial.lastTrendAt } };
    const acceleratedState = { ...state, simulation: { ...state.simulation, speed: 2 } };
    const next = calculateBmsStep(acceleratedState, state.lastTrendAt + 5_000);

    expect(next.tankLevel).toBe(66.5);
    expect(next.energyKwh).toBeGreaterThan(state.energyKwh);
  });

  it("does not advance process state or move its timestamp backward", () => {
    const initial = useBmsStore.getInitialState();
    const lastMessageAt = initial.lastTrendAt + 5_000;
    const state = { ...initial, connection: { ...initial.connection, lastMessageAt } };

    const next = calculateBmsStep(state, initial.lastTrendAt);

    expect(next.tankLevel).toBe(state.tankLevel);
    expect(next.connection?.lastMessageAt).toBe(lastMessageAt);
  });

  it("keeps the tank level within its physical bounds for arbitrary elapsed times", () => {
    const initial = useBmsStore.getInitialState();

    fc.assert(fc.property(
      fc.integer({ min: 0, max: 120_000 }),
      fc.integer({ min: 1, max: 16 }),
      fc.integer({ min: 0, max: 100 }),
      fc.boolean(),
      (elapsedMs, speedQuarterSteps, tankLevel, pumpRunning) => {
        const lastMessageAt = initial.lastTrendAt;
        const state = {
          ...initial,
          tankLevel,
          pump: { ...initial.pump, mode: pumpRunning ? "manual" as const : "off" as const, running: pumpRunning },
          simulation: { ...initial.simulation, speed: speedQuarterSteps / 4 },
          connection: { ...initial.connection, lastMessageAt },
          drainUntil: initial.drainUntil === null ? null : lastMessageAt + elapsedMs,
        };
        const next = calculateBmsStep(state, lastMessageAt + elapsedMs);

        expect(next.tankLevel).toBeGreaterThanOrEqual(0);
        expect(next.tankLevel).toBeLessThanOrEqual(100);
      },
    ));
  });

  it("never rewinds telemetry time for arbitrary out-of-order messages", () => {
    const initial = useBmsStore.getInitialState();

    fc.assert(fc.property(fc.integer({ min: 1, max: 86_400_000 }), (delayMs) => {
      const lastMessageAt = initial.lastTrendAt + delayMs;
      const state = { ...initial, connection: { ...initial.connection, lastMessageAt } };
      const next = calculateBmsStep(state, initial.lastTrendAt);

      expect(next.connection?.lastMessageAt).toBe(lastMessageAt);
      expect(next.tankLevel).toBe(state.tankLevel);
      expect(next.energyKwh).toBe(state.energyKwh);
    }));
  });

  it("recalls elevators to the ground floor and holds them with doors open during fire", () => {
    const initial = useBmsStore.getInitialState();
    const now = initial.lastTrendAt + 30_000;
    const state = {
      ...initial,
      connection: { ...initial.connection, lastMessageAt: initial.lastTrendAt },
      fireInterlock: true,
      elevators: initial.elevators.map((elevator) => ({
        ...elevator,
        currentFloor: 5,
        destinationFloor: 1,
        direction: "down" as const,
        status: "moving" as const,
        door: "closed" as const,
        nextActionAt: initial.lastTrendAt + 500,
      })),
    };

    const next = calculateBmsStep(state, now);

    expect(next.elevators?.every((elevator) => elevator.currentFloor === 1 && elevator.door === "open" && elevator.status === "idle")).toBe(true);
    expect(next.elevators?.every((elevator) => elevator.passengers === 0)).toBe(true);
  });

  it("uses HVAC start and stop thresholds to hold its state inside the deadband", () => {
    const initial = useBmsStore.getInitialState();
    const now = initial.lastTrendAt + 1_000;
    const withinDeadband = { ...initial.hvac, indoorTemperature: 22.8, co2Ppm: 950, setpoint: 22.5 };
    const running = calculateBmsStep({ ...initial, hvac: { ...withinDeadband, running: true } }, now).hvac;
    const stopped = calculateBmsStep({ ...initial, hvac: { ...withinDeadband, running: false } }, now).hvac;

    expect(running?.running).toBe(true);
    expect(stopped?.running).toBe(false);
  });
});