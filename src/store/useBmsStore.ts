import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateBmsStep } from "@/services/bmsSimulationEngine";
import { appendAlarm } from "@/services/alarmUtils";
import { ALARM_SHELVING_DURATIONS_MS, transitionAlarm } from "@/services/alarmLifecycle";
import { transitionGate, type GateMachineState } from "@/services/gateStateMachine";
import { transitionPump, type PumpMachineState, type PumpOperatingMode } from "@/services/pumpStateMachine";

export type OperatingMode = PumpOperatingMode;
export type Severity = "info" | "warning" | "critical";
export type AlarmStatus = "active" | "ack" | "returned" | "cleared";
export type FireZoneId = "zone-1" | "zone-2" | "zone-3" | "zone-4";
export type GateStatus = "closed" | "opening" | "open" | "closing" | "stopped";
export type ConnectionStatus = "connecting" | "online" | "paused" | "offline";
export type HvacMode = "auto" | "manual" | "off";
export type ElevatorDirection = "up" | "down" | "idle";

export interface WeatherLocation {
  id: number | string;
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ElevatorUnit {
  id: string;
  name: string;
  currentFloor: number;
  destinationFloor: number;
  direction: ElevatorDirection;
  door: "open" | "closed";
  status: "moving" | "idle";
  passengers: number;
  capacity: number;
  nextActionAt: number;
  trips: number;
}

export interface AlarmEvent {
  id: string;
  timestamp: number;
  source: string;
  message: string;
  severity: Severity;
  status: AlarmStatus;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  normalizedAt?: number;
  normalizedBy?: string;
  clearedAt?: number;
  clearedBy?: string;
  shelvedUntil?: number;
  shelvingReason?: string;
  shelvedBy?: string;
}

export interface TrendPoint {
  timestamp: number;
  time: string;
  value: number;
}

export interface FireZone {
  id: FireZoneId;
  name: string;
  alarm: boolean;
  acknowledged: boolean;
}

export interface BmsSettings {
  pumpStartLevel: number;
  pumpStopLevel: number;
  pumpTimeoutSeconds: number;
  exteriorLightsOn: string;
  exteriorLightsOff: string;
}

export interface BmsConnection {
  status: ConnectionStatus;
  source: "mock" | "mqtt";
  lastMessageAt: number | null;
}

export interface HvacState {
  mode: HvacMode;
  indoorTemperature: number;
  humidity: number;
  co2Ppm: number;
  occupancy: number;
  setpoint: number;
  running: boolean;
}

export interface SimulationState {
  running: boolean;
  speed: number;
  scenario: string;
}

type PumpState = PumpMachineState;

type GateState = GateMachineState;

export interface BmsState {
  tankLevel: number;
  waterHistory: TrendPoint[];
  pump: PumpState;
  fireZones: FireZone[];
  fireInterlock: boolean;
  gate: GateState;
  lights: Record<string, boolean>;
  settings: BmsSettings;
  alarms: AlarmEvent[];
  energyKw: number;
  energyKwh: number;
  energyHistory: TrendPoint[];
  outdoorTemperature: number | null;
  weatherLocation: WeatherLocation;
  weatherCondition: string;
  weatherCode: number | null;
  weatherHumidity: number | null;
  weatherWindSpeed: number | null;
  weatherFeelsLike: number | null;
  weatherObservedAt: string | null;
  weatherStatus: "loading" | "online" | "offline";
  elevators: ElevatorUnit[];
  hvac: HvacState;
  connection: BmsConnection;
  sensorUpdatedAt: Record<string, number>;
  simulation: SimulationState;
  operatorName: string;
  muted: boolean;
  drainUntil: number | null;
  lastTrendAt: number;
  tick: (messageAt?: number, source?: BmsConnection["source"]) => void;
  setConnection: (connection: Partial<BmsConnection>) => void;
  setSimulationRunning: (running: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  setScenario: (scenario: string) => void;
  activatePeakDemandScenario: () => void;
  setScenarioTankLevel: (level: number) => void;
  resetDemo: () => void;
  setOperatorName: (name: string) => void;
  setHvacMode: (mode: HvacMode) => void;
  adjustHvacSetpoint: (delta: number) => void;
  setPumpMode: (mode: OperatingMode) => void;
  toggleManualPump: () => void;
  resetPumpFault: () => void;
  updateSettings: (settings: Partial<BmsSettings>) => void;
  restoreSettings: () => void;
  emptyTankQuickly: () => void;
  injectPumpFault: () => void;
  injectGateStuckOpen: () => void;
  resetGateFault: () => void;
  triggerFireAlarm: (zoneId: FireZoneId) => void;
  acknowledgeZone: (zoneId: FireZoneId) => void;
  resetFireZone: (zoneId: FireZoneId) => void;
  acknowledgeAlarm: (id: string) => void;
  acknowledgeAllAlarms: () => void;
  shelveAlarm: (id: string, reason: string, durationMs: number) => void;
  unshelveAlarm: (id: string) => void;
  expireShelvedAlarms: (now?: number) => void;
  setMuted: (muted: boolean) => void;
  commandGate: (command: "open" | "close" | "stop") => void;
  toggleLight: (zone: string) => void;
  addAlarm: (source: string, message: string, severity: Severity) => void;
  setWeatherLocation: (location: WeatherLocation) => void;
  setWeatherSnapshot: (snapshot: { temperature: number; condition: string; code: number; humidity: number; windSpeed: number; feelsLike: number; observedAt: string }) => void;
  setWeatherStatus: (status: "loading" | "offline") => void;
}

const initialSettings: BmsSettings = {
  pumpStartLevel: 28,
  pumpStopLevel: 84,
  pumpTimeoutSeconds: 18,
  exteriorLightsOn: "18:30",
  exteriorLightsOff: "06:00",
};

const initialZones: FireZone[] = [
  { id: "zone-1", name: "Hall", alarm: false, acknowledged: false },
  { id: "zone-2", name: "Garagem", alarm: false, acknowledged: false },
  { id: "zone-3", name: "Subsolo", alarm: false, acknowledged: false },
  { id: "zone-4", name: "Cobertura", alarm: false, acknowledged: false },
];

function removeShelving(alarm: AlarmEvent): AlarmEvent {
  const unshelved = { ...alarm };
  delete unshelved.shelvedUntil;
  delete unshelved.shelvingReason;
  delete unshelved.shelvedBy;
  return unshelved;
}

const initialNow = Date.now();
const defaultWeatherLocation: WeatherLocation = {
  id: "sao-paulo-br",
  name: "São Paulo",
  admin1: "São Paulo",
  country: "Brasil",
  latitude: -23.5505,
  longitude: -46.6333,
  timezone: "America/Sao_Paulo",
};
const initialElevators: ElevatorUnit[] = [
  { id: "elev-01", name: "Elevador E-01", currentFloor: 3, destinationFloor: 8, direction: "up", door: "closed", status: "moving", passengers: 4, capacity: 12, nextActionAt: initialNow + 2_500, trips: 0 },
  { id: "elev-02", name: "Elevador E-02", currentFloor: 9, destinationFloor: 9, direction: "idle", door: "open", status: "idle", passengers: 0, capacity: 12, nextActionAt: initialNow + 4_000, trips: 0 },
];
const makeHistory = (value: number): TrendPoint[] =>
  Array.from({ length: 18 }, (_, index) => ({
    timestamp: initialNow - (17 - index) * 5_000,
    time: new Date(initialNow - (17 - index) * 5_000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    value: Math.max(0, Math.min(100, value + Math.sin(index / 2.7) * 4 - (17 - index) * 0.12)),
  }));

export const useBmsStore = create<BmsState>()(persist((set) => ({
  tankLevel: 67,
  waterHistory: makeHistory(67),
  pump: { mode: "auto", running: false, fault: false, runSeconds: 0, noProgressSeconds: 0 },
  fireZones: initialZones,
  fireInterlock: false,
  gate: { status: "closed", openSince: null, transitionEndsAt: null, longOpenAlerted: false, stuckOpen: false },
  lights: { Hall: true, Garagem: true, Subsolo: false, Cobertura: true, Externo: true },
  settings: initialSettings,
  alarms: [
    {
      id: "evt-boot",
      timestamp: initialNow - 2 * 60_000,
      source: "Sistema",
      message: "Controlador conectado. Supervisão iniciada.",
      severity: "info",
      status: "cleared",
    },
  ],
  energyKw: 42.8,
  energyKwh: 1284.6,
  energyHistory: makeHistory(42).map((point) => ({ ...point, value: 38 + (point.value % 10) })),
  outdoorTemperature: null,
  weatherLocation: defaultWeatherLocation,
  weatherCondition: "Carregando clima",
  weatherCode: null,
  weatherHumidity: null,
  weatherWindSpeed: null,
  weatherFeelsLike: null,
  weatherObservedAt: null,
  weatherStatus: "loading",
  elevators: initialElevators,
  hvac: { mode: "auto", indoorTemperature: 22.8, humidity: 48, co2Ppm: 620, occupancy: 22, setpoint: 22.5, running: false },
  connection: { status: "connecting", source: "mock", lastMessageAt: null },
  sensorUpdatedAt: { tankLevel: initialNow, energy: initialNow, weather: 0, indoorAir: initialNow, fire: initialNow, gate: initialNow, elevators: initialNow },
  simulation: { running: true, speed: 1, scenario: "Operação normal" },
  operatorName: "Operador Sentinel",
  muted: false,
  drainUntil: null,
  lastTrendAt: initialNow,

  addAlarm: (source, message, severity) =>
    set((state) => ({ alarms: appendAlarm(state.alarms, source, message, severity) })),

  tick: (messageAt, source) => set((state) => calculateBmsStep(state, messageAt ?? Date.now(), source)),
  setConnection: (connection) => set((state) => ({ connection: { ...state.connection, ...connection } })),
  setSimulationRunning: (running) => set((state) => {
    if (state.simulation.running === running) return state;
    return {
      simulation: { ...state.simulation, running },
      alarms: appendAlarm(state.alarms, "Operação", `Simulação ${running ? "retomada" : "pausada"} por ${state.operatorName}.`, "info"),
    };
  }),
  setSimulationSpeed: (speed) => set((state) => {
    const nextSpeed = Math.max(0.25, Math.min(4, speed));
    if (state.simulation.speed === nextSpeed) return state;
    return {
      simulation: { ...state.simulation, speed: nextSpeed },
      alarms: appendAlarm(state.alarms, "Operação", `Velocidade da simulação alterada para ${nextSpeed}× por ${state.operatorName}.`, "info"),
    };
  }),
  setScenario: (scenario) => set((state) => ({ simulation: { ...state.simulation, scenario } })),
  activatePeakDemandScenario: () => set((state) => ({
    lights: Object.fromEntries(Object.keys(state.lights).map((zone) => [zone, true])),
    simulation: { ...state.simulation, scenario: "Pico de demanda", running: true },
    alarms: appendAlarm(state.alarms, "Cenário de demonstração", `Pico de demanda iniciado por ${state.operatorName}: todos os circuitos de iluminação foram ligados.`, "warning"),
  })),
  setScenarioTankLevel: (level) => set((state) => ({
    tankLevel: Math.max(0, Math.min(100, level)),
    simulation: { ...state.simulation, scenario: "Nível baixo de água" },
    alarms: appendAlarm(state.alarms, "Cenário de demonstração", `Nível ajustado para ${level}% para demonstrar o controle automático.`, "warning"),
  })),
  resetDemo: () => set((state) => {
    const timestamp = Date.now();
    return {
      tankLevel: 67,
      pump: { mode: "auto", running: false, fault: false, runSeconds: 0, noProgressSeconds: 0 },
      fireZones: initialZones.map((zone) => ({ ...zone })),
      fireInterlock: false,
      gate: { status: "closed", openSince: null, transitionEndsAt: null, longOpenAlerted: false, stuckOpen: false },
      drainUntil: null,
      simulation: { ...state.simulation, scenario: "Operação normal", running: true },
      alarms: appendAlarm(state.alarms.map((alarm) => transitionAlarm(alarm, "return-to-normal", state.operatorName, timestamp)), "Simulação", `Cenário reiniciado por ${state.operatorName}. Eventos em andamento foram encerrados.`, "info", timestamp),
    };
  }),
  setOperatorName: (operatorName) => set((state) => {
    const nextName = operatorName.trim().slice(0, 48) || "Operador Sentinel";
    if (nextName === state.operatorName) return state;
    return {
      operatorName: nextName,
      alarms: appendAlarm(state.alarms, "Auditoria de operadores", `Identificação alterada de ${state.operatorName} para ${nextName}.`, "info"),
    };
  }),
  setHvacMode: (mode) => set((state) => {
    if (state.hvac.mode === mode) return state;
    return {
      hvac: { ...state.hvac, mode, running: mode === "off" ? false : state.hvac.running },
      alarms: appendAlarm(state.alarms, "HVAC", `Modo alterado para ${mode.toUpperCase()} por ${state.operatorName}.`, "info"),
    };
  }),
  adjustHvacSetpoint: (delta) => set((state) => {
    const setpoint = Number(Math.max(18, Math.min(28, state.hvac.setpoint + delta)).toFixed(1));
    if (setpoint === state.hvac.setpoint) return state;
    return {
      hvac: { ...state.hvac, setpoint },
      alarms: appendAlarm(state.alarms, "HVAC", `Setpoint ajustado para ${setpoint.toFixed(1)} °C por ${state.operatorName}.`, "info"),
    };
  }),

  setPumpMode: (mode) => {
    set((state) => ({
      pump: transitionPump(state.pump, { type: "set-mode", mode }),
      alarms: appendAlarm(state.alarms, "Bomba hidráulica", `Modo alterado para ${mode.toUpperCase()} por ${state.operatorName}.`, "info"),
    }));
  },
  toggleManualPump: () => set((state) => {
    const pump = transitionPump(state.pump, { type: "toggle-manual" });
    if (pump === state.pump) return state;
    return {
      pump,
      alarms: appendAlarm(state.alarms, "Bomba hidráulica", `Comando manual de ${state.operatorName}: ${state.pump.running ? "parar" : "ligar"}.`, "info"),
    };
  }),
  resetPumpFault: () => set((state) => {
    const timestamp = Date.now();
    return {
      pump: transitionPump(state.pump, { type: "reset-fault" }),
      alarms: appendAlarm(state.alarms.map((alarm) => alarm.source === "Bomba hidráulica" && alarm.severity === "critical"
        ? transitionAlarm(alarm, "return-to-normal", state.operatorName, timestamp)
        : alarm), "Bomba hidráulica", `Falha resetada por ${state.operatorName}.`, "info", timestamp),
    };
  }),
  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates },
    alarms: appendAlarm(state.alarms, "Configurações", `Parâmetros operacionais atualizados por ${state.operatorName}.`, "info"),
  })),
  restoreSettings: () => set((state) => ({
    settings: { ...initialSettings },
    alarms: appendAlarm(state.alarms, "Configurações", `Parâmetros restaurados aos padrões por ${state.operatorName}.`, "info"),
  })),
  emptyTankQuickly: () => set((state) => ({
    drainUntil: Date.now() + 45_000,
    alarms: appendAlarm(state.alarms, "Dev mode", `Simulação de esvaziamento rápido iniciada por ${state.operatorName} (45s).`, "warning"),
  })),
  injectPumpFault: () => set((state) => ({
    pump: transitionPump(state.pump, { type: "inject-fault" }),
    alarms: appendAlarm(state.alarms, "Bomba hidráulica", `Falha injetada por ${state.operatorName} no modo de desenvolvimento.`, "critical"),
  })),
  injectGateStuckOpen: () => set((state) => {
    const timestamp = Date.now();
    return {
      gate: { status: "open", openSince: timestamp, transitionEndsAt: null, longOpenAlerted: false, stuckOpen: true },
      alarms: appendAlarm(state.alarms, "Portão principal", `Falha injetada por ${state.operatorName}: portão travado em posição aberta.`, "critical", timestamp),
    };
  }),
  resetGateFault: () => set((state) => {
    const timestamp = Date.now();
    return {
      gate: { ...state.gate, stuckOpen: false },
      alarms: appendAlarm(state.alarms.map((alarm) => alarm.source === "Portão principal" && alarm.severity === "critical"
        ? transitionAlarm(alarm, "return-to-normal", state.operatorName, timestamp)
        : alarm), "Portão principal", `Falha do portão resetada por ${state.operatorName}.`, "info", timestamp),
    };
  }),
  triggerFireAlarm: (zoneId) => set((state) => {
    const zone = state.fireZones.find((item) => item.id === zoneId);
    if (!zone || zone.alarm) return state;
    const timestamp = Date.now();
    return {
      fireZones: state.fireZones.map((item) => item.id === zoneId ? { ...item, alarm: true, acknowledged: false } : item),
      fireInterlock: true,
      elevators: state.fireInterlock ? state.elevators : state.elevators.map((elevator) => elevator.currentFloor <= 1
        ? { ...elevator, currentFloor: 1, destinationFloor: 1, direction: "idle", status: "idle", door: "open", passengers: 0 }
        : { ...elevator, destinationFloor: 1, direction: "down", status: "moving", door: "closed", nextActionAt: timestamp + 500 / state.simulation.speed }),
      gate: { status: "open", openSince: state.gate.status === "open" && state.gate.openSince !== null ? state.gate.openSince : timestamp, transitionEndsAt: null, longOpenAlerted: state.gate.longOpenAlerted, stuckOpen: state.gate.stuckOpen },
      alarms: appendAlarm(state.alarms, `Incêndio · ${zone.name}`, `Detecção de incêndio na ${zone.name.toLowerCase()}. Interlock: portões liberados.`, "critical", timestamp),
    };
  }),
  acknowledgeZone: (zoneId) => set((state) => {
    const zone = state.fireZones.find((item) => item.id === zoneId);
    if (!zone?.alarm || zone.acknowledged) return state;
    const acknowledgedAt = Date.now();
    return {
      fireZones: state.fireZones.map((item) => item.id === zoneId ? { ...item, acknowledged: true } : item),
      alarms: state.alarms.map((alarm) => alarm.source === `Incêndio · ${zone.name}` && alarm.status === "active" ? { ...alarm, status: "ack", acknowledgedAt, acknowledgedBy: state.operatorName } : alarm),
    };
  }),
  resetFireZone: (zoneId) => set((state) => {
    const zone = state.fireZones.find((item) => item.id === zoneId);
    if (!zone?.alarm || !zone.acknowledged) return state;
    const fireZones = state.fireZones.map((item) => item.id === zoneId ? { ...item, alarm: false, acknowledged: false } : item);
    const fireInterlock = fireZones.some((item) => item.alarm);
    const timestamp = Date.now();
    return {
      fireZones,
      fireInterlock,
      alarms: appendAlarm(
        state.alarms.map((alarm) => alarm.source === `Incêndio · ${zone.name}`
          ? transitionAlarm(alarm, "return-to-normal", state.operatorName, timestamp)
          : alarm),
        `Incêndio · ${zone.name}`,
        `Zona resetada por ${state.operatorName}.`,
        "info",
        timestamp,
      ),
    };
  }),
  acknowledgeAlarm: (id) => set((state) => {
    const target = state.alarms.find((alarm) => alarm.id === id);
    if (!target || (target.status !== "active" && target.status !== "returned")) return state;
    const fireZoneName = target.source.startsWith("Incêndio · ") ? target.source.slice("Incêndio · ".length) : null;
    return {
      alarms: state.alarms.map((alarm) => alarm.id === id ? transitionAlarm(alarm, "acknowledge", state.operatorName, Date.now()) : alarm),
      fireZones: fireZoneName && target.status === "active" ? state.fireZones.map((zone) => zone.name === fireZoneName ? { ...zone, acknowledged: true } : zone) : state.fireZones,
    };
  }),
  acknowledgeAllAlarms: () => set((state) => {
    const acknowledgedAt = Date.now();
    const newlyAcknowledged = state.alarms.filter((alarm) => alarm.status === "active" || alarm.status === "returned").length;
    return {
      alarms: appendAlarm(state.alarms.map((alarm) => transitionAlarm(alarm, "acknowledge", state.operatorName, acknowledgedAt)), "Operação", `ACK All executado por ${state.operatorName} (${newlyAcknowledged} evento${newlyAcknowledged === 1 ? "" : "s"}).`, "info", acknowledgedAt),
      fireZones: state.fireZones.map((zone) => zone.alarm ? { ...zone, acknowledged: true } : zone),
    };
  }),
  shelveAlarm: (id, reason, durationMs) => set((state) => {
    const target = state.alarms.find((alarm) => alarm.id === id);
    const shelvingReason = reason.trim().slice(0, 120);
    if (!target || (target.status !== "active" && target.status !== "ack") || !shelvingReason
      || !ALARM_SHELVING_DURATIONS_MS.includes(durationMs as typeof ALARM_SHELVING_DURATIONS_MS[number])) return state;
    const timestamp = Date.now();
    return {
      alarms: appendAlarm(state.alarms.map((alarm) => alarm.id === id ? {
        ...alarm,
        shelvedUntil: timestamp + durationMs,
        shelvingReason,
        shelvedBy: state.operatorName,
      } : alarm), "Shelving", `Alarme ${target.source} silenciado temporariamente por ${state.operatorName}: ${shelvingReason}.`, "info", timestamp),
    };
  }),
  unshelveAlarm: (id) => set((state) => {
    const target = state.alarms.find((alarm) => alarm.id === id);
    if (!target?.shelvedUntil) return state;
    const timestamp = Date.now();
    return {
      alarms: appendAlarm(state.alarms.map((alarm) => {
        if (alarm.id !== id) return alarm;
        return removeShelving(alarm);
      }), "Shelving", `Silenciamento removido de ${target.source} por ${state.operatorName}.`, "info", timestamp),
    };
  }),
  expireShelvedAlarms: (now = Date.now()) => set((state) => {
    const expired = state.alarms.filter((alarm) => alarm.shelvedUntil !== undefined && alarm.shelvedUntil <= now);
    if (expired.length === 0) return state;
    const expiredIds = new Set(expired.map((alarm) => alarm.id));
    const alarms = state.alarms.map((alarm) => {
      if (!expiredIds.has(alarm.id)) return alarm;
      return removeShelving(alarm);
    });
    return {
      alarms: expired.reduce((nextAlarms, alarm) => appendAlarm(nextAlarms, "Shelving", `Silenciamento expirou para ${alarm.source}; motivo: ${alarm.shelvingReason ?? "não informado"}.`, "info", now), alarms),
    };
  }),
  setMuted: (muted) => set({ muted }),
  commandGate: (command) => set((state) => {
    const timestamp = Date.now();
    const transition = transitionGate(state.gate, command, state.fireInterlock, timestamp);
    if (transition.type === "unchanged") return state;
    if (transition.type === "blocked") {
      const source = transition.reason === "fire-interlock" ? "Interlock de incêndio" : "Portão principal";
      const reason = transition.reason === "fire-interlock"
        ? "enquanto houver alarme de incêndio ativo"
        : "falha de portão travado ainda não foi resetada";
      return { alarms: appendAlarm(state.alarms, source, `Comando de fechamento de ${state.operatorName} bloqueado: ${reason}.`, "warning", timestamp) };
    }

    const message = command === "stop"
      ? `Movimento interrompido por ${state.operatorName}.`
      : `Comando de ${state.operatorName} para ${command === "open" ? "abrir" : "fechar"}.`;
    return {
      gate: transition.gate,
      alarms: appendAlarm(state.alarms, "Portão principal", message, "info", timestamp),
    };
  }),
  toggleLight: (zone) => set((state) => {
    if (!(zone in state.lights)) return state;
    const enabled = !state.lights[zone];
    return {
      lights: { ...state.lights, [zone]: enabled },
      alarms: appendAlarm(state.alarms, `Iluminação · ${zone}`, `Luzes ${enabled ? "ligadas" : "desligadas"} por ${state.operatorName}.`, "info"),
    };
  }),
  setWeatherLocation: (weatherLocation) => set((state) => ({
    weatherLocation,
    outdoorTemperature: null,
    weatherCondition: "Atualizando clima",
    weatherCode: null,
    weatherHumidity: null,
    weatherWindSpeed: null,
    weatherFeelsLike: null,
    weatherObservedAt: null,
    weatherStatus: "loading",
    alarms: appendAlarm(state.alarms, "Clima externo", `Local de referência alterado para ${weatherLocation.name}${weatherLocation.admin1 ? `, ${weatherLocation.admin1}` : ""}.`, "info"),
  })),
  setWeatherSnapshot: ({ temperature, condition, code, humidity, windSpeed, feelsLike, observedAt }) => set((state) => ({
    outdoorTemperature: temperature,
    weatherCondition: condition,
    weatherCode: code,
    weatherHumidity: humidity,
    weatherWindSpeed: windSpeed,
    weatherFeelsLike: feelsLike,
    weatherObservedAt: observedAt,
    weatherStatus: "online",
    sensorUpdatedAt: { ...state.sensorUpdatedAt, weather: Date.now() },
  })),
  setWeatherStatus: (weatherStatus) => set({ weatherStatus }),
}), {
  name: "sentinel-bms-runtime-v1",
  version: 4,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    settings: state.settings,
    alarms: state.alarms,
    lights: state.lights,
    tankLevel: state.tankLevel,
    pump: state.pump,
    fireZones: state.fireZones,
    fireInterlock: state.fireInterlock,
    gate: state.gate,
    energyKwh: state.energyKwh,
    waterHistory: state.waterHistory,
    energyHistory: state.energyHistory,
    outdoorTemperature: state.outdoorTemperature,
    weatherLocation: state.weatherLocation,
    weatherCondition: state.weatherCondition,
    weatherCode: state.weatherCode,
    weatherHumidity: state.weatherHumidity,
    weatherWindSpeed: state.weatherWindSpeed,
    weatherFeelsLike: state.weatherFeelsLike,
    weatherObservedAt: state.weatherObservedAt,
    elevators: state.elevators,
    hvac: state.hvac,
    simulation: state.simulation,
    operatorName: state.operatorName,
    muted: state.muted,
  }),
  migrate: (persistedState, version) => {
    const saved = persistedState as Partial<BmsState>;
    if (version < 2) {
      return {
        ...saved,
        settings: { ...initialSettings, ...saved.settings },
        alarms: Array.isArray(saved.alarms) ? saved.alarms.slice(0, 500) : [],
      };
    }
    return saved;
  },
  merge: (persistedState, currentState) => {
    const saved = persistedState as Partial<BmsState>;
    const now = Date.now();
    return {
      ...currentState,
      ...saved,
      settings: { ...currentState.settings, ...saved.settings },
      simulation: { ...currentState.simulation, ...saved.simulation },
      connection: currentState.connection,
      weatherStatus: "loading",
      sensorUpdatedAt: { tankLevel: now, energy: now, weather: saved.sensorUpdatedAt?.weather ?? 0, indoorAir: now, fire: now, gate: now, elevators: now },
      lastTrendAt: now,
      elevators: saved.elevators?.length ? saved.elevators : currentState.elevators,
    };
  },
}));
