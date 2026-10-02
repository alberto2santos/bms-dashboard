export type PumpOperatingMode = "auto" | "manual" | "off";

export interface PumpMachineState {
  mode: PumpOperatingMode;
  running: boolean;
  fault: boolean;
  runSeconds: number;
  noProgressSeconds: number;
}

export type PumpMachineCommand =
  | { type: "set-mode"; mode: PumpOperatingMode }
  | { type: "toggle-manual" }
  | { type: "evaluate"; tankLevel: number; startLevel: number; stopLevel: number }
  | { type: "latch-fault" }
  | { type: "reset-fault" }
  | { type: "inject-fault" };

export function transitionPump(pump: PumpMachineState, command: PumpMachineCommand): PumpMachineState {
  switch (command.type) {
    case "set-mode":
      if (pump.mode === command.mode) return pump;
      return {
        ...pump,
        mode: command.mode,
        running: command.mode === "off" || pump.fault ? false : pump.running,
      };
    case "toggle-manual":
      if (pump.mode !== "manual" || pump.fault) return pump;
      return { ...pump, running: !pump.running, noProgressSeconds: 0 };
    case "evaluate":
      if (pump.fault || pump.mode === "off") return pump.running ? { ...pump, running: false } : pump;
      if (pump.mode !== "auto") return pump;
      if (!pump.running && command.tankLevel <= command.startLevel) return { ...pump, running: true };
      if (pump.running && command.tankLevel >= command.stopLevel) return { ...pump, running: false };
      return pump;
    case "latch-fault":
    case "inject-fault":
      if (pump.fault && !pump.running && pump.noProgressSeconds === 0) return pump;
      return { ...pump, running: false, fault: true, noProgressSeconds: 0 };
    case "reset-fault":
      if (!pump.fault && !pump.running && pump.noProgressSeconds === 0) return pump;
      return { ...pump, fault: false, running: false, noProgressSeconds: 0 };
  }
}