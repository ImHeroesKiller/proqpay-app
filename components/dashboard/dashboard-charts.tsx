"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/utils";

type Point = { month: string; amount: number };

export function DashboardCharts({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B3A6E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0B3A6E" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "#f28c28", strokeWidth: 1, strokeDasharray: "4 4" }}
          contentStyle={{
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--card-solid)",
            boxShadow: "var(--shadow-soft)",
            fontSize: 12,
          }}
          formatter={(value) => formatRupiah(Number(value) * 1_000_000)}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#0B3A6E"
          strokeWidth={2.5}
          fill="url(#payrollFill)"
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
