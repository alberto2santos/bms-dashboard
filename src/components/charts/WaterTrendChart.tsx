"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/store/useBmsStore";

export function WaterTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[194px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 2, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-water)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-water)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={34} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--bms-divider)", borderRadius: 9, color: "var(--chart-tooltip-text)", fontSize: 12 }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Nível"]} />
          <Area type="monotone" dataKey="value" stroke="var(--chart-water)" strokeWidth={2} fill="url(#waterFill)" activeDot={{ r: 3, fill: "var(--chart-water)", stroke: "var(--bms-inset)", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
