export const trendRanges = {
  "15m": { label: "15 min", milliseconds: 15 * 60_000 },
  "1h": { label: "1 hora", milliseconds: 60 * 60_000 },
  "6h": { label: "6 horas", milliseconds: 6 * 60 * 60_000 },
} as const;

export type TrendRangeKey = keyof typeof trendRanges;
