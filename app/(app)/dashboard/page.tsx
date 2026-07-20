export const dynamic = "force-dynamic";

import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardAlerts,
  getDashboardKpis,
  getPayrollChartData,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  ShieldAlert,
} from "lucide-react";

const alertIcon = {
  warning: AlertTriangle,
  info: Info,
  danger: ShieldAlert,
  success: CheckCircle2,
} as const;

export default async function DashboardPage() {
  const [dashboardKpis, dashboardAlerts, payrollPeriods, chartData] =
    await Promise.all([
      getDashboardKpis(),
      getDashboardAlerts(),
      getPayrollPeriods(),
      getPayrollChartData(),
    ]);

  const upcoming = payrollPeriods.find((p) => p.status === "WAITING");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Executive view of payroll operations, approvals, and funding."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/payroll">View payroll</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/payroll">
                <Plus className="h-3.5 w-3.5" />
                New period
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payroll amount trend (IDR juta)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <DashboardCharts data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts & compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardAlerts.map((alert) => {
              const Icon = alertIcon[alert.type];
              return (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 text-orange" />
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming payroll</CardTitle>
            {upcoming ? <Badge variant="warning">{upcoming.status}</Badge> : null}
          </CardHeader>
          <CardContent>
            {upcoming ? (
              <div className="space-y-2 text-sm">
                <p className="text-lg font-semibold">{upcoming.name}</p>
                <p className="text-muted-foreground">
                  Pay date · {upcoming.payDate}
                </p>
                <p className="text-muted-foreground">
                  Net total · {formatRupiah(upcoming.totalNet)}
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href={`/payroll/${upcoming.id}`}>Open period</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming payroll.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Generate payroll", href: "/payroll" },
              { label: "Review approvals", href: "/approval" },
              { label: "Disbursement batches", href: "/disbursement" },
              { label: "Working capital", href: "/working-capital" },
              { label: "Export reports", href: "/reports" },
              { label: "Audit trail", href: "/audit" },
            ].map((action) => (
              <Button key={action.href} asChild variant="outline" size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
