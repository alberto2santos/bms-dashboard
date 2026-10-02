import { describe, expect, it } from "vitest";
import { advanceElevator } from "@/services/elevatorStateMachine";
import type { ElevatorUnit } from "@/store/useBmsStore";

const elevator: ElevatorUnit = {
  id: "elev-01",
  name: "Elevador E-01",
  currentFloor: 2,
  destinationFloor: 3,
  direction: "up",
  door: "closed",
  status: "moving",
  passengers: 4,
  capacity: 12,
  nextActionAt: 1_000,
  trips: 0,
};

describe("elevator state machine", () => {
  it("opens the doors and records a trip when reaching its destination", () => {
    expect(advanceElevator(elevator, 1_000, 1, false)).toMatchObject({
      currentFloor: 3,
      destinationFloor: 3,
      direction: "idle",
      status: "idle",
      door: "open",
      trips: 1,
    });
  });

  it("recalls the elevator to floor one and clears passengers", () => {
    const recalling = advanceElevator(elevator, 1_000, 1, true);
    const arrived = advanceElevator(recalling, 40_000, 1, true);

    expect(arrived).toMatchObject({
      currentFloor: 1,
      destinationFloor: 1,
      direction: "idle",
      status: "idle",
      door: "open",
      passengers: 0,
    });
  });

  it("keeps the car within floors one through twelve during large time jumps", () => {
    const result = advanceElevator({ ...elevator, nextActionAt: 0 }, 1_000_000, 4, false);

    expect(result.currentFloor).toBeGreaterThanOrEqual(1);
    expect(result.currentFloor).toBeLessThanOrEqual(12);
  });
});