"use client";

import { Activity, AlertTriangle, CircleOff, LoaderCircle } from "lucide-react";
import type { ConnectionStatus } from "@/store/useBmsStore";
import { useCurrentTime } from "@/hooks/useCurrentTime";

interface SensorFreshnessProps {
  sensor: string;
  updatedAt: number;
  connection: ConnectionStatus;
  compact?: boolean;
}

export function SensorFreshness({ sensor, updatedAt, connection, compact = false }: SensorFreshnessProps) {
  const now = useCurrentTime(1_000);

  const ageSeconds = Math.max(0, Math.floor((now - updatedAt) / 1_000));
  const paused = connection === "paused";
  const stale = connection === "offline" || ageSeconds >= 10;
  const delayed = !paused && !stale && (connection === "connecting" || connection !== "online" || ageSeconds >= 3);
  const status = paused ? "pausado" : stale ? "desatualizado" : delayed ? "atrasado" : "online";
  const color = paused || delayed ? "text-amber-300" : stale ? "text-rose-300" : "text-emerald-300";
  const Icon = paused ? CircleOff : stale ? AlertTriangle : delayed ? LoaderCircle : Activity;
  const ageLabel = ageSeconds === 0 ? "agora" : `há ${ageSeconds}s`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? "text-[8px]" : "text-[9px]"} ${color}`} title={`${sensor}: ${status.toLowerCase()} (${ageLabel})`}>
      <Icon size={compact ? 10 : 11} className={delayed ? "animate-spin" : ""} />
      {!compact && <span>{paused ? `${sensor} pausado` : stale ? `${sensor} sem atualização` : delayed ? `${sensor} com atraso` : `${sensor} · ${ageLabel}`}</span>}
    </span>
  );
}
