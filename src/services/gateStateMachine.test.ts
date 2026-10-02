import { describe, expect, it } from "vitest";
import { transitionGate, type GateMachineState } from "@/services/gateStateMachine";

const closedGate: GateMachineState = {
  status: "closed",
  openSince: null,
  transitionEndsAt: null,
  longOpenAlerted: false,
  stuckOpen: false,
};

describe("gate state machine", () => {
  it("blocks closing during fire interlock without changing gate state", () => {
    expect(transitionGate(closedGate, "close", true, 1_000)).toEqual({ type: "blocked", reason: "fire-interlock" });
  });

  it("blocks closing while the gate fault is latched", () => {
    expect(transitionGate({ ...closedGate, stuckOpen: true }, "close", false, 1_000)).toEqual({ type: "blocked", reason: "stuck-open" });
  });

  it("starts an opening transition and sets its deadline", () => {
    expect(transitionGate(closedGate, "open", false, 1_000)).toEqual({
      type: "transitioned",
      gate: { ...closedGate, status: "opening", transitionEndsAt: 3_200 },
    });
  });

  it("ignores repeated open commands and stopping a gate that is not moving", () => {
    expect(transitionGate({ ...closedGate, status: "open" }, "open", false, 1_000)).toEqual({ type: "unchanged" });
    expect(transitionGate(closedGate, "stop", false, 1_000)).toEqual({ type: "unchanged" });
  });
});