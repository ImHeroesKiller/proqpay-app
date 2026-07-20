"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

type Point = { month: string; amount: number };

export function DashboardCharts({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <EmptyState
        title="No trend data yet"
        description="Payroll amount history will appear after periods are recorded."
        className="h-full min-h-48 border-0"
      />
    );
  }

  return (
    <div
      className="h-full w-full min-h-[16rem]"
      role="img"
      aria-label="Bar chart of payroll amounts by period in million IDR"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(11, 58, 110, 0.06)" }}
            formatter={(value) => [
              formatRupiah(Number(value) * 1_000_000),
              "Payroll net",
            ]}
            labelFormatter={(label) => `Period ${label}`}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="amount"
            name="Payroll net (juta)"
            fill="#0B3A6E"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="sr-only">
        Payroll amounts in million rupiah for recent periods:{" "}
        {data.map((d) => `${d.month}: ${d.amount}`).join(", ")}.
      </p>
    </div>
  );
}
