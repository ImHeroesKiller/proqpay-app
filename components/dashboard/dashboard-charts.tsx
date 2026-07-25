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

type Point = { month: string; amount: number };

export function DashboardCharts({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="#e4e7ef"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
          width={44}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          cursor={{ stroke: "#f28c28", strokeWidth: 1, strokeDasharray: "4 4" }}
          contentStyle={{
            borderRadius: 16,
            border: "1px solid #e4e7ef",
            background: "#ffffff",
            boxShadow: "0 8px 24px rgba(11, 31, 51, 0.08)",
            fontSize: 13,
          }}
          formatter={(value) => [
            `Rp ${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`,
            "Payroll",
          ]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#2563eb"
          strokeWidth={2.5}
          fill="url(#payrollFill)"
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
