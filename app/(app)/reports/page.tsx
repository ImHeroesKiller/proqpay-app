export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportsCharts } from "@/components/reports/reports-charts";
import {
  getEmployees,
  getPayrollChartData,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";
import { Download } from "lucide-react";

export default async function ReportsPage() {
  const [employees, payrollPeriods, chartData] = await Promise.all([
    getEmployees(),
    getPayrollPeriods(),
    getPayrollChartData(),
  ]);

  const latest =
    payrollPeriods.find((p) => p.status === "WAITING") ??
    payrollPeriods.find((p) => p.totalNet > 0) ??
    payrollPeriods[0];

  const departmentCost = Object.entries(
    employees.reduce<Record<string, number>>((acc, emp) => {
      acc[emp.department] = (acc[emp.department] ?? 0) + emp.baseSalary;
      return acc;
    }, {}),
  ).map(([department, cost]) => ({ department, cost: cost / 1_000_000 }));

  const salaryTrend = chartData.map((p) => ({
    month: p.month,
    net: p.amount,
  }));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Executive payroll summary, department cost, and trends."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              Payroll summary ({latest?.name ?? "—"})
            </CardTitle>
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
          <CardContent className="text-3xl font-bold">
            {employees.length}
          </CardContent>
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

      <ReportsCharts
        salaryTrend={salaryTrend}
        departmentCost={departmentCost}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Export buttons are UX placeholders for PDF / Excel / CSV generation.
        Charts and KPIs are loaded from Supabase PostgreSQL.
      </p>
    </div>
  );
}
