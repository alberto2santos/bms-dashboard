import mqtt from "mqtt";
import { alarmEventSchema, bmsTelemetrySchema } from "../src/services/bmsContracts";
import { getHistorianPool } from "../src/services/historian";

const brokerUrl = process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883";
const credentials = process.env.MQTT_USERNAME ? {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
} : {};
const client = mqtt.connect(brokerUrl, { ...credentials, reconnectPeriod: 5_000 });
const pool = getHistorianPool();

client.on("connect", () => {
  client.subscribe(["sentinel/+/telemetry", "sentinel/+/alarms"], { qos: 1 }, (error) => {
    if (error) console.error("Falha ao assinar tópicos MQTT:", error.message);
    else console.info("Coletor MQTT conectado e inscrito nos tópicos Sentinel.");
  });
});

client.on("message", (topic, payload) => {
  void persistMessage(topic, payload.toString()).catch((error: unknown) => {
    console.error(`Falha ao persistir mensagem ${topic}:`, error);
  });
});

client.on("error", (error) => console.error("Erro no cliente MQTT:", error.message));

async function persistMessage(topic: string, rawPayload: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    console.warn(`JSON inválido descartado em ${topic}.`);
    return;
  }

  const [, topicDeviceId, messageType] = topic.split("/");
  if (messageType === "telemetry") {
    const parsed = bmsTelemetrySchema.safeParse(payload);
    if (!parsed.success || parsed.data.deviceId !== topicDeviceId) {
      console.warn(`Telemetria inválida descartada em ${topic}.`);
      return;
    }
    const { deviceId, timestamp, readings } = parsed.data;
    await pool.query(
      `INSERT INTO telemetry_readings (device_id, timestamp_ms, tank_level_percent, demand_kw, energy_kwh)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (device_id, timestamp_ms) DO NOTHING`,
      [deviceId, timestamp, readings.tankLevelPercent, readings.demandKw, readings.energyKwh],
    );
    return;
  }

  if (messageType === "alarms") {
    const parsed = alarmEventSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn(`Evento de alarme inválido descartado em ${topic}.`);
      return;
    }
    const event = parsed.data;
    await pool.query(
      `INSERT INTO alarm_events (event_id, timestamp_ms, payload) VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO UPDATE SET timestamp_ms = EXCLUDED.timestamp_ms, payload = EXCLUDED.payload`,
      [event.id, event.timestamp, JSON.stringify(event)],
    );
  }
}

function shutdown() {
  client.end(true);
  void pool.end().finally(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);