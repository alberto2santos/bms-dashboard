"use client";

import { useEffect } from "react";
import { useBmsStore } from "@/store/useBmsStore";
import { startSiren, stopSiren } from "@/utils/audioAlert";
import { createBmsTransport } from "@/services/bmsTransport";

export function useBmsSimulation() {
  const criticalActive = useBmsStore((state) => state.alarms.some((alarm) => alarm.severity === "critical" && alarm.status === "active" && alarm.shelvedUntil === undefined));
  const muted = useBmsStore((state) => state.muted);
  const simulationRunning = useBmsStore((state) => state.simulation.running);
  const simulationSpeed = useBmsStore((state) => state.simulation.speed);

  useEffect(() => {
    const store = useBmsStore.getState();
    if (!simulationRunning) {
      store.setConnection({ status: "paused", source: "mock", lastMessageAt: null });
      return;
    }

    const transport = createBmsTransport("mock");
    store.setConnection({ status: "connecting", source: transport.source, lastMessageAt: null });
    const disconnect = transport.connect(({ receivedAt, source }) => {
      useBmsStore.getState().tick(receivedAt, source);
    }, Math.max(250, 1_000 / simulationSpeed));
    return () => disconnect();
  }, [simulationRunning, simulationSpeed]);

  useEffect(() => {
    const expireShelvedAlarms = useBmsStore.getState().expireShelvedAlarms;
    const interval = window.setInterval(() => expireShelvedAlarms(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (criticalActive && !muted) void startSiren();
    else stopSiren();
    return () => stopSiren();
  }, [criticalActive, muted]);
}
