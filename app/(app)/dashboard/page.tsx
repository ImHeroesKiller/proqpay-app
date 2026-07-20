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
import { requireModule } from "@/lib/auth/session";
import { formatRupiah } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { canViewExecutiveDashboard } from "@/lib/auth/permissions";
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
  const scope = await requireModule("dashboard");
  const [dashboardKpis, dashboardAlerts, payrollPeriods, chartData] =
    await Promise.all([
      getDashboardKpis(scope.role, scope),
      getDashboardAlerts(scope),
      getPayrollPeriods(scope),
      getPayrollChartData(scope),
    ]);

  const upcoming = payrollPeriods.find((p) => p.status === "WAITING");
  const executive = canViewExecutiveDashboard(scope.role);

  return (
    <div>
      <PageHeader
        title={executive ? "Operations & executive dashboard" : "Operations dashboard"}
        description="After payment instruction, the client transfers from the client bank and uploads proof. ProQPay verifies before payroll closes."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/payment-instructions">Instructions</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/payment-confirmation">
                <Plus className="h-3.5 w-3.5" />
                Payment confirmation
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
            {upcoming ? (
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {fundingModelLabel(upcoming.fundingModel)}
                </Badge>
                <Badge variant="warning">{upcoming.status}</Badge>
              </div>
            ) : null}
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
                <p className="text-xs text-muted-foreground">
                  Source of funds path does not force working capital unless the
                  period is marked WORKING_CAPITAL.
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
              { label: "Payment instructions", href: "/payment-instructions" },
              { label: "Payment confirmation", href: "/payment-confirmation" },
              { label: "Working capital", href: "/working-capital" },
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
