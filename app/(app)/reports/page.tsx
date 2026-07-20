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
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { employees, payrollPeriods } from "@/lib/data/seed";
import { formatRupiah } from "@/lib/utils";
import { Download } from "lucide-react";

const salaryTrend = [
  { month: "Feb", net: 105 },
  { month: "Mar", net: 109 },
  { month: "Apr", net: 111.6 },
  { month: "May", net: 121.6 },
  { month: "Jun", net: 123.75 },
];

const departmentCost = Object.entries(
  employees.reduce<Record<string, number>>((acc, emp) => {
    acc[emp.department] = (acc[emp.department] ?? 0) + emp.baseSalary;
    return acc;
  }, {}),
).map(([department, cost]) => ({ department, cost: cost / 1_000_000 }));

export default function ReportsPage() {
  const latest = payrollPeriods.find((p) => p.id === "pp_2026_06");

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Executive payroll summary, department cost, and trends."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Payroll summary (Jun)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Gross · {formatRupiah(latest?.totalGross ?? 0)}</p>
            <p>Deductions · {formatRupiah(latest?.totalDeductions ?? 0)}</p>
            <p className="font-semibold">
              Net · {formatRupiah(latest?.totalNet ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Headcount</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{employees.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {departmentCost.length}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salary trend (IDR juta net)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salaryTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#0B3A6E"
                  fill="#0B3A6E22"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Department cost (base salary, IDR juta)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentCost}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="cost" fill="#F28C28" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Export buttons are wired as UX placeholders for PDF / Excel / CSV generation.
      </p>
    </div>
  );
}
