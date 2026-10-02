import type { TelemetryPulse } from "@/services/bmsContracts";

export type BmsTransportSource = "mock" | "mqtt";

export type { TelemetryPulse } from "@/services/bmsContracts";

export interface BmsTransport {
  readonly source: BmsTransportSource;
  connect(onTelemetry: (pulse: TelemetryPulse) => void, intervalMs: number): () => void;
}

/** Transporte de simulação no navegador; um adaptador MQTT ou WebSocket pode implementar o mesmo contrato. */
export class MockBmsTransport implements BmsTransport {
  readonly source = "mock" as const;

  connect(onTelemetry: (pulse: TelemetryPulse) => void, intervalMs: number) {
    const sendPulse = () => onTelemetry({ receivedAt: Date.now(), source: this.source });
    sendPulse();
    const timer = window.setInterval(sendPulse, intervalMs);
    return () => window.clearInterval(timer);
  }
}

export const createBmsTransport = (source: BmsTransportSource = "mock"): BmsTransport => {
  if (source === "mock") return new MockBmsTransport();
  throw new Error("O adaptador MQTT precisa ser configurado com endpoint e credenciais do ambiente.");
};
