export type GateMachineCommand = "open" | "close" | "stop";

export interface GateMachineState {
  status: "closed" | "opening" | "open" | "closing" | "stopped";
  openSince: number | null;
  transitionEndsAt: number | null;
  longOpenAlerted: boolean;
  stuckOpen: boolean;
}

export type GateTransitionResult =
  | { type: "blocked"; reason: "fire-interlock" | "stuck-open" }
  | { type: "unchanged" }
  | { type: "transitioned"; gate: GateMachineState };

export function transitionGate(
  gate: GateMachineState,
  command: GateMachineCommand,
  fireInterlock: boolean,
  now: number,
): GateTransitionResult {
  if (command === "close" && fireInterlock) return { type: "blocked", reason: "fire-interlock" };
  if (command === "close" && gate.stuckOpen) return { type: "blocked", reason: "stuck-open" };

  if (command === "stop") {
    if (gate.status !== "opening" && gate.status !== "closing") return { type: "unchanged" };
    return { type: "transitioned", gate: { ...gate, status: "stopped", transitionEndsAt: null } };
  }

  if (command === "open" && (gate.status === "open" || gate.status === "opening")) return { type: "unchanged" };
  if (command === "close" && (gate.status === "closed" || gate.status === "closing")) return { type: "unchanged" };

  const opening = command === "open";
  return {
    type: "transitioned",
    gate: {
      ...gate,
      status: opening ? "opening" : "closing",
      transitionEndsAt: now + 2_200,
      openSince: opening ? gate.openSince : null,
      longOpenAlerted: opening ? gate.longOpenAlerted : false,
    },
  };
}