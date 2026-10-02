import { z } from "zod";

export const epochMillisecondsSchema = z.number().int().nonnegative();

export const telemetryPulseSchema = z.object({
  receivedAt: epochMillisecondsSchema,
  source: z.enum(["mock", "mqtt"]),
}).strict();

export const bmsTelemetrySchema = z.object({
  schemaVersion: z.literal(1),
  deviceId: z.string().trim().min(1).max(64),
  timestamp: epochMillisecondsSchema,
  readings: z.object({
    tankLevelPercent: z.number().finite().min(0).max(100),
    demandKw: z.number().finite().nonnegative(),
    energyKwh: z.number().finite().nonnegative(),
  }).strict(),
}).strict();

const commandMetadata = {
  schemaVersion: z.literal(1),
  commandId: z.string().uuid(),
  issuedAt: epochMillisecondsSchema,
  issuedBy: z.string().trim().min(1).max(48),
};

export const bmsCommandSchema = z.discriminatedUnion("target", [
  z.object({ ...commandMetadata, target: z.literal("gate"), action: z.enum(["open", "close", "stop"]) }).strict(),
  z.object({ ...commandMetadata, target: z.literal("pump"), action: z.enum(["start", "stop", "reset-fault"]) }).strict(),
]);

export const alarmEventSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  timestamp: epochMillisecondsSchema,
  source: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1_000),
  severity: z.enum(["info", "warning", "critical"]),
  status: z.enum(["active", "ack", "returned", "cleared"]),
  acknowledgedAt: epochMillisecondsSchema.optional(),
  acknowledgedBy: z.string().trim().min(1).max(48).optional(),
  normalizedAt: epochMillisecondsSchema.optional(),
  normalizedBy: z.string().trim().min(1).max(48).optional(),
  clearedAt: epochMillisecondsSchema.optional(),
  clearedBy: z.string().trim().min(1).max(48).optional(),
  shelvedUntil: epochMillisecondsSchema.optional(),
  shelvingReason: z.string().trim().min(1).max(120).optional(),
  shelvedBy: z.string().trim().min(1).max(48).optional(),
}).strict();

export const mlPredictionResponseSchema = z.object({
  deviceId: z.string().min(1),
  timestamp: epochMillisecondsSchema,
  isAnomaly: z.boolean(),
  anomalyScore: z.number().finite(),
  modelTrainedAt: epochMillisecondsSchema,
  sampleCount: z.number().int().positive(),
}).strict();

export type TelemetryPulse = z.infer<typeof telemetryPulseSchema>;
export type BmsTelemetry = z.infer<typeof bmsTelemetrySchema>;
export type BmsCommand = z.infer<typeof bmsCommandSchema>;
export type AlarmEventContract = z.infer<typeof alarmEventSchema>;
export type MlPredictionResponse = z.infer<typeof mlPredictionResponseSchema>;