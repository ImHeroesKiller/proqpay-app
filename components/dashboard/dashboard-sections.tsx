import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { loadDashboardBundle } from "@/lib/data/dashboard";
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
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

const alertIcon = {
  warning: AlertTriangle,
  info: Info,
  danger: ShieldAlert,
  success: CheckCircle2,
} as const;

type ScopeProps = {
  userId: string;
  role: Role;
  companyId: string | null | undefined;
};

/** KPI strip + payroll pipeline — primary above-the-fold content. */
export async function DashboardPrimarySection({
  userId,
  role,
  companyId,
}: ScopeProps) {
  const data = await loadDashboardBundle(userId, role, companyId);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item, i) => (
          <KpiCard key={item.label} item={item} index={i} />
        ))}
      </div>

      <Card className="mt-5 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payroll pipeline</CardTitle>
          <CardDescription>
            Counts by operational stage across periods in your scope
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                {
                  label: "Draft / validation",
                  value: data.pipeline.draft,
                  href: "/payroll",
                },
                {
                  label: "Pending approval",
                  value: data.pipeline.waiting,
                  href: "/approval",
                },
                {
                  label: "Ready for payment",
                  value: data.pipeline.instruction,
                  href: "/payment-instructions",
                },
                {
                  label: "Awaiting transfer",
                  value: data.pipeline.transfer,
                  href: "/payment-confirmation",
                },
                {
                  label: "Awaiting verification",
                  value: data.pipeline.proof,
                  href: "/payment-confirmation",
                },
                {
                  label: "Completed",
                  value: data.pipeline.closed,
                  href: "/payroll",
                },
              ] as const
            ).map((s) => (
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
    </>
  );
}

/** Charts, alerts, active cycle, quick actions — secondary content. */
export async function DashboardSecondarySection({
  userId,
  role,
  companyId,
}: ScopeProps) {
  const data = await loadDashboardBundle(userId, role, companyId);
  const executive = canViewExecutiveDashboard(role);
  const active = data.active;

  return (
    <>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payroll amount trend</CardTitle>
            <CardDescription>
              Net payroll by recent period (IDR juta). Hover for full rupiah.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <DashboardCharts data={data.chartData} />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Critical alerts</CardTitle>
            <CardDescription>Compliance and operational signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.length === 0 ? (
              <EmptyState
                title="No alerts"
                description="No outstanding operational alerts in your scope."
                className="min-h-32 border-0 py-6"
              />
            ) : (
              data.alerts.map((alert) => {
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
                {
                  label: "Payment instructions",
                  href: "/payment-instructions",
                },
                {
                  label: "Payment confirmation",
                  href: "/payment-confirmation",
                },
                ...(canViewWorkingCapitalLimits(role)
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
    </>
  );
}

export function DashboardKpiSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading KPIs">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-4">
        <Skeleton className="mb-3 h-4 w-40" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSecondarySkeleton() {
  return (
    <div className="mt-5 space-y-5" aria-busy="true" aria-label="Loading insights">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-2">
          <Skeleton className="mb-3 h-4 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="rounded-lg border border-border p-4">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="mt-2 h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
