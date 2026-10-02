import type { BmsState, TrendPoint } from "@/store/useBmsStore";
import { appendAlarm } from "@/services/alarmUtils";
import { transitionAlarm } from "@/services/alarmLifecycle";
import { advanceElevator } from "@/services/elevatorStateMachine";
import { transitionPump } from "@/services/pumpStateMachine";

const MAX_TREND_POINTS = 4_320;
const chartTime = (time: number) => new Date(time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function isWithinSchedule(now: Date, start: string, end: string) {
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const from = startHour * 60 + startMinute;
  const to = endHour * 60 + endMinute;
  return from <= to ? current >= from && current < to : current >= from || current < to;
}

function point(timestamp: number, value: number): TrendPoint {
  return { timestamp, time: chartTime(timestamp), value };
}

export function calculateBmsStep(state: BmsState, timestamp: number, source: "mock" | "mqtt" = "mock"): Partial<BmsState> {
  const now = Math.max(timestamp, state.connection.lastMessageAt ?? timestamp);
  const elapsedMs = state.connection.lastMessageAt === null ? 0 : now - state.connection.lastMessageAt;
  const settings = state.settings;
  const simulatedSeconds = Math.max(0, elapsedMs / 1_000) * state.simulation.speed;
  let pump = { ...state.pump };
  let alarms = state.alarms;
  let gate = { ...state.gate };
  let lights = state.lights;
  let tankLevel = state.tankLevel;
  const elevators = state.elevators.map((elevator) => advanceElevator(elevator, now, state.simulation.speed, state.fireInterlock));

  pump = transitionPump(pump, { type: "evaluate", tankLevel, startLevel: settings.pumpStartLevel, stopLevel: settings.pumpStopLevel });

  const draining = state.drainUntil !== null && now < state.drainUntil;
  const delta = (draining ? -3.2 : pump.running ? 0.82 : -0.055) * simulatedSeconds;
  tankLevel = Math.max(0, Math.min(100, tankLevel + delta));
  const actualDelta = tankLevel - state.tankLevel;
  pump.runSeconds = pump.running ? pump.runSeconds + simulatedSeconds : 0;
  pump.noProgressSeconds = pump.running && actualDelta <= 0 ? pump.noProgressSeconds + simulatedSeconds : 0;

  if (pump.running && pump.noProgressSeconds >= settings.pumpTimeoutSeconds && !pump.fault) {
    pump = transitionPump(pump, { type: "latch-fault" });
    alarms = appendAlarm(alarms, "Bomba hidráulica", `Sem progresso por ${settings.pumpTimeoutSeconds}s. Falha de bombeamento detectada.`, "critical", now);
  }

  if ((gate.status === "opening" || gate.status === "closing") && gate.transitionEndsAt !== null && now >= gate.transitionEndsAt) {
    const closingFinished = gate.status === "closing";
    gate = gate.status === "opening"
      ? { ...gate, status: "open", openSince: now, transitionEndsAt: null, longOpenAlerted: false }
      : { ...gate, status: "closed", openSince: null, transitionEndsAt: null, longOpenAlerted: false };
    if (closingFinished) {
      alarms = alarms.map((alarm) => alarm.source === "Portão principal" && alarm.message.startsWith("Portão aberto há mais de")
        ? transitionAlarm(alarm, "return-to-normal", "Sistema", now)
        : alarm);
    }
  }

  if (gate.status === "open" && gate.openSince !== null && !gate.longOpenAlerted && now - gate.openSince >= 5 * 60_000) {
    alarms = appendAlarm(alarms, "Portão principal", "Portão aberto há mais de 5 minutos. Verifique a segurança do acesso.", "warning", now);
    gate = { ...gate, longOpenAlerted: true };
  }

  const shouldExteriorLightsBeOn = isWithinSchedule(new Date(now), settings.exteriorLightsOn, settings.exteriorLightsOff);
  if (lights.Externo !== shouldExteriorLightsBeOn) {
    lights = { ...lights, Externo: shouldExteriorLightsBeOn };
    alarms = appendAlarm(alarms, "Iluminação externa", `Agenda automática: luzes ${shouldExteriorLightsBeOn ? "ligadas" : "desligadas"}.`, "info", now);
  }

  const occupancy = Math.max(0, Math.round(18 + 15 * Math.sin(now / 300_000)));
  const hvac = { ...state.hvac };
  if (hvac.mode === "auto") {
    const temperatureThreshold = hvac.setpoint + (hvac.running ? 0.2 : 0.4);
    const co2Threshold = hvac.running ? 900 : 1_000;
    hvac.running = hvac.indoorTemperature > temperatureThreshold || hvac.co2Ppm > co2Threshold;
  }
  if (hvac.mode === "off") hvac.running = false;
  hvac.occupancy = occupancy;
  const outdoorTemperature = state.outdoorTemperature ?? 24;
  const temperatureResponse = hvac.running ? 0.09 : 0.002;
  const temperatureTarget = hvac.running ? hvac.setpoint : outdoorTemperature;
  const temperatureAdjustment = 1 - (1 - temperatureResponse) ** simulatedSeconds;
  hvac.indoorTemperature = Number((hvac.indoorTemperature + (temperatureTarget - hvac.indoorTemperature) * temperatureAdjustment).toFixed(1));
  hvac.humidity = Number(Math.max(35, Math.min(68, hvac.humidity + Math.sin(now / 47_000) * 0.08)).toFixed(1));
  hvac.co2Ppm = Math.max(400, Math.round(590 + occupancy * 6 - (hvac.running ? 65 : 0) + Math.sin(now / 13_000) * 12));

  const energyKw = Number((31 + (lights.Hall ? 3.4 : 0) + (lights.Garagem ? 4.1 : 0) + (lights.Subsolo ? 5.8 : 0) + (lights.Cobertura ? 2.7 : 0) + (lights.Externo ? 1.6 : 0) + (pump.running ? 8.6 : 0) + (hvac.running ? 6.2 : 0) + Math.sin(now / 17_000) * 1.7).toFixed(1));
  const energyKwh = Number((state.energyKwh + energyKw * simulatedSeconds / 3_600).toFixed(3));
  const sampleTrend = now - state.lastTrendAt >= 5_000;
  const waterHistory = sampleTrend ? [...state.waterHistory, point(now, Number(tankLevel.toFixed(1)))].slice(-MAX_TREND_POINTS) : state.waterHistory;
  const energyHistory = sampleTrend ? [...state.energyHistory, point(now, energyKw)].slice(-MAX_TREND_POINTS) : state.energyHistory;

  return {
    tankLevel: Number(tankLevel.toFixed(1)),
    pump,
    gate,
    lights,
    alarms,
    hvac,
    energyKw,
    energyKwh,
    elevators,
    waterHistory,
    energyHistory,
    drainUntil: state.drainUntil !== null && now >= state.drainUntil ? null : state.drainUntil,
    lastTrendAt: sampleTrend ? now : state.lastTrendAt,
    connection: { ...state.connection, status: "online", source, lastMessageAt: now },
    sensorUpdatedAt: { ...state.sensorUpdatedAt, tankLevel: now, energy: now, indoorAir: now, fire: now, gate: now, elevators: now },
  };
}
