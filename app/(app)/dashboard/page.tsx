export const dynamic = "force-dynamic";

import Link from "next/link";
import { CommandHero } from "@/components/dashboard/command-hero";
import { AttentionCenter } from "@/components/dashboard/attention-center";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ChartsLazy } from "@/components/dashboard/charts-lazy";
import { PayrollPipeline } from "@/components/dashboard/payroll-pipeline";
import { buildPipeline } from "@/lib/domain/payroll-pipeline";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAuditLogs,
  getDashboardAlerts,
  getDashboardKpis,
  getPayrollChartData,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { buildHeuristicInsights } from "@/lib/ai/proq-intelligence";

export default async function DashboardPage() {
  const scope = await requireModule("dashboard");
  const session = await auth();
  const [dashboardKpis, dashboardAlerts, payrollPeriods, chartData, auditLogs] =
    await Promise.all([
      getDashboardKpis(scope.role, scope),
      getDashboardAlerts(scope),
      getPayrollPeriods(scope),
      getPayrollChartData(scope),
      getAuditLogs(scope),
    ]);

  const active =
    payrollPeriods.find((p) =>
      [
        "WAITING",
        "APPROVED",
        "PAYMENT_INSTRUCTION_GENERATED",
        "WAITING_CLIENT_TRANSFER",
        "TRANSFER_PROOF_UPLOADED",
        "UNDER_VERIFICATION",
      ].includes(p.status),
    ) ?? payrollPeriods[0];

  const hasDanger = dashboardAlerts.some((a) => a.type === "danger");
  const hasWarning = dashboardAlerts.some((a) => a.type === "warning");
  const healthTone = hasDanger ? "critical" : hasWarning ? "watch" : "good";
  const healthLabel = hasDanger
    ? "Critical attention required"
    : hasWarning
      ? "Watch — open items"
      : "Healthy · on track";

  const pipeline = buildPipeline(active?.status, {
    pendingApprovals: dashboardAlerts.some((a) => a.id === "al_approval")
      ? 1
      : 0,
    failedPayments: dashboardAlerts.some((a) => a.id === "al_fail") ? 1 : 0,
  });

  const initialIntelligence = buildHeuristicInsights({
    userName: session?.user?.name,
    kpis: dashboardKpis,
    alerts: dashboardAlerts,
    periods: payrollPeriods,
  });

  return (
    <div className="space-y-6">
      <CommandHero
        periodName={active?.name}
        healthLabel={healthLabel}
        healthTone={healthTone}
        initialIntelligence={initialIntelligence}
      />

      <section aria-label="Payroll pipeline">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display">Payroll pipeline</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Attendance → Validation → Calculation → Approval → Instruction →
                Confirmation → Completed
              </p>
            </div>
            {active ? (
              <Badge variant="secondary">{active.status.replaceAll("_", " ")}</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            <PayrollPipeline stages={pipeline} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Key performance indicators">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardKpis.map((item, index) => (
            <KpiCard key={item.label} item={item} index={index} />
          ))}
        </div>
      </section>

      <section aria-label="Quick actions">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Quick actions</h2>
            <p className="text-xs text-muted-foreground">
              High-frequency payroll operations
            </p>
          </div>
        </div>
        <QuickActions />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payroll value trend</CardTitle>
            <p className="text-xs text-muted-foreground">
              Net payroll by period (IDR juta)
            </p>
          </CardHeader>
          <CardContent className="h-72">
            <ChartsLazy data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention center</CardTitle>
            <p className="text-xs text-muted-foreground">
              Critical · Warning · Information
            </p>
          </CardHeader>
          <CardContent>
            <AttentionCenter alerts={dashboardAlerts} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Active payroll</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Current period at a glance
              </p>
            </div>
            {active ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {fundingModelLabel(active.fundingModel)}
                </Badge>
                <Badge variant="warning">
                  {active.status.replaceAll("_", " ")}
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {active ? (
              <div className="space-y-2 text-sm">
                <p className="font-display text-lg font-semibold">{active.name}</p>
                <p className="text-muted-foreground">
                  Pay date · {active.payDate}
                </p>
                <p className="text-muted-foreground">
                  Net total · {formatRupiah(active.totalNet)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {active.employeeCount} employees · source of funds follows the
                  period funding model.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href={`/payroll/${active.id}`}>Open period</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active payroll period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Recent operational events
            </p>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <ActivityTimeline items={auditLogs.slice(0, 8)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
