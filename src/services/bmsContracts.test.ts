import { describe, expect, it } from "vitest";
import { alarmEventSchema, bmsCommandSchema, bmsTelemetrySchema, mlPredictionResponseSchema, telemetryPulseSchema } from "@/services/bmsContracts";

describe("BMS transport contracts", () => {
  it("accepts telemetry with epoch-millisecond timestamps and bounded readings", () => {
    const telemetry = {
      schemaVersion: 1,
      deviceId: "sentinel-controller-01",
      timestamp: 1_782_940_800_000,
      readings: { tankLevelPercent: 67.5, demandKw: 42.2, energyKwh: 1284.6 },
    };

    expect(bmsTelemetrySchema.parse(telemetry)).toEqual(telemetry);
  });

  it("rejects invalid timestamps, out-of-range levels, and unknown fields", () => {
    const telemetry = {
      schemaVersion: 1,
      deviceId: "sentinel-controller-01",
      timestamp: -1,
      readings: { tankLevelPercent: 101, demandKw: 42.2, energyKwh: 1284.6 },
      extra: true,
    };

    expect(bmsTelemetrySchema.safeParse(telemetry).success).toBe(false);
  });

  it("accepts known command variants and rejects unsupported actions", () => {
    const gateCommand = {
      schemaVersion: 1,
      commandId: "6a5a6492-3ebf-42be-8e3b-c01cb00d8e08",
      issuedAt: 1_782_940_800_000,
      issuedBy: "Operador Sentinel",
      target: "gate",
      action: "open",
    };

    expect(bmsCommandSchema.parse(gateCommand)).toEqual(gateCommand);
    expect(bmsCommandSchema.safeParse({ ...gateCommand, action: "unlock" }).success).toBe(false);
  });

  it("validates alarm event timestamps and lifecycle fields", () => {
    const event = {
      schemaVersion: 1,
      id: "event-1",
      timestamp: 1_782_940_800_000,
      source: "Bomba hidráulica",
      message: "Falha detectada",
      severity: "critical",
      status: "ack",
      acknowledgedAt: 1_782_940_801_000,
      acknowledgedBy: "Operador Sentinel",
    };

    expect(alarmEventSchema.parse(event)).toEqual(event);
    expect(alarmEventSchema.safeParse({ ...event, acknowledgedAt: -1 }).success).toBe(false);
  });

  it("defines a strict, timestamped transport pulse", () => {
    expect(telemetryPulseSchema.parse({ receivedAt: 1_782_940_800_000, source: "mqtt" })).toEqual({ receivedAt: 1_782_940_800_000, source: "mqtt" });
    expect(telemetryPulseSchema.safeParse({ receivedAt: "now", source: "mqtt" }).success).toBe(false);
  });

  it("validates the online model prediction response", () => {
    const prediction = {
      deviceId: "sentinel-controller-01",
      timestamp: 1_782_940_800_000,
      isAnomaly: true,
      anomalyScore: -0.18,
      modelTrainedAt: 1_782_940_000_000,
      sampleCount: 1_000,
    };

    expect(mlPredictionResponseSchema.parse(prediction)).toEqual(prediction);
    expect(mlPredictionResponseSchema.safeParse({ ...prediction, sampleCount: 0 }).success).toBe(false);
  });
});