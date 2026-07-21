"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRupiah } from "@/lib/utils";

type TrendPoint = { month: string; net: number };
type DeptPoint = { department: string; cost: number };

export function ReportsCharts({
  salaryTrend,
  departmentCost,
}: {
  salaryTrend: TrendPoint[];
  departmentCost: DeptPoint[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary trend</CardTitle>
          <CardDescription>
            Net payroll by period (IDR juta). Hover for full amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {salaryTrend.length === 0 ? (
            <EmptyState
              title="No trend data"
              description="Payroll periods will populate this chart."
              className="h-full min-h-48 border-0"
            />
          ) : (
            <div
              className="h-full w-full"
              role="img"
              aria-label="Area chart of net salary by period"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salaryTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    formatter={(value) => [
                      formatRupiah(Number(value) * 1_000_000),
                      "Net payroll",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name="Net (juta)"
                    stroke="#0B3A6E"
                    fill="#0B3A6E22"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department cost</CardTitle>
          <CardDescription>
            Base salary mass by department (IDR juta)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {departmentCost.length === 0 ? (
            <EmptyState
              title="No department data"
              description="Employee directory will populate this chart."
              className="h-full min-h-48 border-0"
            />
          ) : (
            <div
              className="h-full w-full"
              role="img"
              aria-label="Bar chart of department base salary cost"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentCost}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    formatter={(value) => [
                      formatRupiah(Number(value) * 1_000_000),
                      "Base salary",
                    ]}
                  />
                  <Bar dataKey="cost" name="Cost (juta)" fill="#F28C28" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
