"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/store/useBmsStore";

export function EnergyTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[112px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 2, left: -26, bottom: 0 }}>
          <defs><linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-energy)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--chart-energy)" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={38} />
          <YAxis domain={([dataMin, dataMax]) => [Math.floor(Number(dataMin) - 5), Math.ceil(Number(dataMax) + 5)]} tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--bms-divider)", borderRadius: 9, color: "var(--chart-tooltip-text)", fontSize: 12 }} formatter={(value) => [`${Number(value).toFixed(1)} kW`, "Demanda"]} />
          <Area type="monotone" dataKey="value" stroke="var(--chart-energy)" strokeWidth={2} fill="url(#energyFill)" activeDot={{ r: 3, fill: "var(--chart-energy)", stroke: "var(--bms-inset)", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
