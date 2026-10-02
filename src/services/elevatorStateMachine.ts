import type { ElevatorUnit } from "@/store/useBmsStore";

export function advanceElevator(elevator: ElevatorUnit, now: number, speed: number, recallActive: boolean): ElevatorUnit {
  let next = elevator;

  if (recallActive) {
    if (elevator.currentFloor <= 1) {
      return { ...elevator, currentFloor: 1, destinationFloor: 1, direction: "idle", status: "idle", door: "open", passengers: 0 };
    }
    if (elevator.destinationFloor !== 1 || elevator.direction !== "down" || elevator.status !== "moving") {
      next = { ...elevator, destinationFloor: 1, direction: "down", status: "moving", door: "closed", nextActionAt: now + 500 / speed };
    }
  }

  let transitions = 0;
  while (next.nextActionAt <= now && transitions < 100) {
    const actionAt = next.nextActionAt;
    if (recallActive) {
      const currentFloor = Math.max(1, next.currentFloor - 1);
      if (currentFloor === 1) {
        return { ...next, currentFloor, destinationFloor: 1, direction: "idle", status: "idle", door: "open", passengers: 0, nextActionAt: actionAt + 5_000 / speed };
      }
      next = { ...next, currentFloor, destinationFloor: 1, direction: "down", status: "moving", door: "closed", nextActionAt: actionAt + 2_500 / speed };
    } else if (next.status === "moving") {
      const currentFloor = Math.max(1, Math.min(12, next.currentFloor + (next.direction === "up" ? 1 : -1)));
      const arrived = currentFloor === next.destinationFloor;
      next = {
        ...next,
        currentFloor,
        status: arrived ? "idle" : "moving",
        direction: arrived ? "idle" : next.direction,
        door: arrived ? "open" : "closed",
        passengers: arrived ? Math.round(2 + (Math.abs(Math.sin(actionAt / 91_000)) * (next.capacity - 2))) : next.passengers,
        trips: arrived ? next.trips + 1 : next.trips,
        nextActionAt: actionAt + (arrived ? 5_000 : 2_500) / speed,
      };
    } else if (next.door === "open") {
      next = { ...next, door: "closed", nextActionAt: actionAt + 700 / speed };
    } else {
      const direction = next.currentFloor >= 12 || (next.currentFloor > 1 && next.trips % 2 === 1) ? "down" : "up";
      next = {
        ...next,
        destinationFloor: direction === "up" ? 12 : 1,
        direction,
        status: "moving",
        nextActionAt: actionAt + 500 / speed,
      };
    }
    transitions += 1;
  }

  return next;
}