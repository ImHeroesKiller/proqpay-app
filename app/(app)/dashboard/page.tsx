export const dynamic = "force-dynamic";

import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardAlerts,
  getDashboardKpis,
  getPayrollChartData,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { formatRupiah, formatDate } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";
import {
  canViewExecutiveDashboard,
  canViewWorkingCapitalLimits,
} from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

const alertIcon = {
  warning: AlertTriangle,
  info: Info,
  danger: ShieldAlert,
  success: CheckCircle2,
} as const;

function roleFocus(role: Role): {
  eyebrow: string;
  title: string;
  description: string;
  actions: { label: string; href: string; primary?: boolean }[];
} {
  if (role === "DIRECTOR" || role === "SUPER_ADMIN") {
    return {
      eyebrow: "Executive command center",
      title: "Operations & executive dashboard",
      description:
        "Payroll value, completion, exposure, and operational risk at a glance. Partner funds never go directly to employees — client bank remains the transfer source.",
      actions: [
        { label: "Reports", href: "/reports" },
        { label: "Audit trail", href: "/audit" },
        { label: "Approvals", href: "/approval", primary: true },
      ],
    };
  }
  if (role === "FINANCE") {
    return {
      eyebrow: "Finance operations",
      title: "Finance payroll dashboard",
      description:
        "Focus on payable amounts, payment instructions, proof verification, working capital exposure, and settlement status.",
      actions: [
        { label: "Payment instructions", href: "/payment-instructions" },
        { label: "Working capital", href: "/working-capital" },
        { label: "Confirmations", href: "/payment-confirmation", primary: true },
      ],
    };
  }
  if (role === "PAYROLL_ADMIN" || role === "PAYROLL_OPERATOR") {
    return {
      eyebrow: "Payroll operations",
      title: "Payroll operations dashboard",
      description:
        "Current cycle, validation and approval queues, missing data, and confirmation follow-ups for your active periods.",
      actions: [
        { label: "Open payroll", href: "/payroll" },
        { label: "Approvals", href: "/approval" },
        { label: "Upload / verify proof", href: "/payment-confirmation", primary: true },
      ],
    };
  }
  return {
    eyebrow: "Operations",
    title: "Operations dashboard",
    description:
      "After payment instruction, the client transfers from the client bank and uploads proof. ProQPay verifies before payroll closes.",
    actions: [
      { label: "Payroll", href: "/payroll" },
      { label: "Payment confirmation", href: "/payment-confirmation", primary: true },
    ],
  };
}

export default async function DashboardPage() {
  const scope = await requireModule("dashboard");
  const [dashboardKpis, dashboardAlerts, payrollPeriods, chartData] =
    await Promise.all([
      getDashboardKpis(scope.role, scope),
      getDashboardAlerts(scope),
      getPayrollPeriods(scope),
      getPayrollChartData(scope),
    ]);

  const focus = roleFocus(scope.role);
  const executive = canViewExecutiveDashboard(scope.role);
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
    ) ?? payrollPeriods.find((p) => p.status === "DRAFT");

  const queueCounts = {
    draft: payrollPeriods.filter((p) => p.status === "DRAFT").length,
    waiting: payrollPeriods.filter((p) => p.status === "WAITING").length,
    instruction: payrollPeriods.filter((p) =>
      ["PAYMENT_INSTRUCTION_GENERATED", "APPROVED"].includes(p.status),
    ).length,
    transfer: payrollPeriods.filter((p) =>
      p.status === "WAITING_CLIENT_TRANSFER",
    ).length,
    proof: payrollPeriods.filter((p) =>
      ["TRANSFER_PROOF_UPLOADED", "UNDER_VERIFICATION"].includes(p.status),
    ).length,
    closed: payrollPeriods.filter((p) =>
      ["CLOSED", "VERIFIED", "DISBURSED"].includes(p.status),
    ).length,
  };

  return (
    <div>
      <PageHeader
        eyebrow={focus.eyebrow}
        title={focus.title}
        description={focus.description}
        actions={
          <>
            {focus.actions.map((a) => (
              <Button
                key={a.href}
                asChild
                variant={a.primary ? "accent" : "outline"}
                size="sm"
              >
                <Link href={a.href}>
                  {a.primary ? <Plus className="h-3.5 w-3.5" /> : null}
                  {a.label}
                </Link>
              </Button>
            ))}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((item, i) => (
          <KpiCard key={item.label} item={item} index={i} />
        ))}
      </div>

      {/* Operational pipeline strip */}
      <Card className="mt-5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payroll pipeline</CardTitle>
          <CardDescription>
            Counts by operational stage across periods in your scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Draft / validation", value: queueCounts.draft, href: "/payroll" },
              { label: "Pending approval", value: queueCounts.waiting, href: "/approval" },
              { label: "Ready for payment", value: queueCounts.instruction, href: "/payment-instructions" },
              { label: "Awaiting transfer", value: queueCounts.transfer, href: "/payment-confirmation" },
              { label: "Awaiting verification", value: queueCounts.proof, href: "/payment-confirmation" },
              { label: "Completed", value: queueCounts.closed, href: "/payroll" },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-lg border border-border bg-muted/30 px-3 py-3 transition hover:border-msg-blue/30 hover:bg-muted/50"
              >
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payroll amount trend</CardTitle>
            <CardDescription>
              Net payroll by recent period (IDR juta). Hover for full rupiah.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <DashboardCharts data={chartData} />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Critical alerts</CardTitle>
            <CardDescription>Compliance and operational signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardAlerts.length === 0 ? (
              <EmptyState
                title="No alerts"
                description="No outstanding operational alerts in your scope."
                className="min-h-32 border-0 py-6"
              />
            ) : (
              dashboardAlerts.map((alert) => {
                const Icon = alertIcon[alert.type];
                return (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={
                          alert.type === "danger"
                            ? "mt-0.5 h-4 w-4 text-destructive"
                            : "mt-0.5 h-4 w-4 text-orange"
                        }
                        aria-hidden
                      />
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
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Active payroll cycle</CardTitle>
              <CardDescription>
                Primary period requiring operator attention
              </CardDescription>
            </div>
            {active ? <StatusBadge status={active.status} /> : null}
          </CardHeader>
          <CardContent>
            {active ? (
              <div className="space-y-2 text-sm">
                <p className="text-lg font-semibold">{active.name}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {fundingModelLabel(active.fundingModel)}
                  </Badge>
                  <Badge variant="outline">
                    {active.employeeCount} employees
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Pay date · {formatDate(active.payDate)}
                </p>
                <p className="text-muted-foreground">
                  Net total · {formatRupiah(active.totalNet)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Next step depends on status: validate data, obtain approvals,
                  issue payment instruction, or verify client transfer proof.
                </p>
                <Button asChild size="sm" className="mt-2">
                  <Link href={`/payroll/${active.id}`}>
                    Open period
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No active cycle"
                description="No payroll period is currently in an active operational state."
                guidance="Create or open a draft period from Payroll."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/payroll">Go to payroll</Link>
                  </Button>
                }
                className="min-h-32 border-0 py-4"
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Contextual quick actions</CardTitle>
            <CardDescription>
              Role-aware shortcuts — permissions still enforced server-side
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { label: "Generate / open payroll", href: "/payroll" },
                { label: "Review approvals", href: "/approval" },
                { label: "Payment instructions", href: "/payment-instructions" },
                { label: "Payment confirmation", href: "/payment-confirmation" },
                ...(canViewWorkingCapitalLimits(scope.role)
                  ? [{ label: "Working capital", href: "/working-capital" }]
                  : []),
                ...(executive
                  ? [{ label: "Audit trail", href: "/audit" }]
                  : [{ label: "Reports", href: "/reports" }]),
              ] as { label: string; href: string }[]
            ).map((action) => (
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
