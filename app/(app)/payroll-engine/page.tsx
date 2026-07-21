export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngineNav } from "@/components/payroll-engine/engine-nav";
import { formatCompactIDR } from "@/lib/format/idr";

export default async function PayrollEnginePage() {
  await requireModule("payroll");

  const [tax, bpjs, formulas, calculations] = await Promise.all([
    prisma.taxConfig.count({ where: { isActive: true } }).catch(() => 0),
    prisma.bpjsConfig.count({ where: { isActive: true } }).catch(() => 0),
    prisma.payrollFormula.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.payrollCalculation
      .findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          runNumber: true,
          status: true,
          netTotal: true,
          employeeCount: true,
          payrollPeriodId: true,
          runReason: true,
          calculatedAt: true,
        },
      })
      .catch(() => []),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Payroll Engine"
        title="Enterprise Payroll Engine"
        description="Tax, BPJS, formulas, validation, revisions, comparison, and audit — computation layer for operational PayrollLine (ADR-001)."
        actions={
          <Link
            href="/payroll"
            className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-semibold shadow-sm"
          >
            Open operational payroll
          </Link>
        }
      />
      <EngineNav current="/payroll-engine" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="Active tax profiles" value={String(tax)} href="/payroll-engine/tax" />
        <Stat title="Active BPJS profiles" value={String(bpjs)} href="/payroll-engine/bpjs" />
        <Stat title="Active formulas" value={String(formulas)} href="/payroll-engine/formulas" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent calculation runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {calculations.length === 0 ? (
            <p className="text-muted-foreground">
              No runs yet. Configure tax/BPJS, then Run calculation on a payroll period.
            </p>
          ) : (
            calculations.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <div>
                  <p className="font-semibold">
                    Run #{c.runNumber} · {c.runReason ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.employeeCount} emp · net{" "}
                    {formatCompactIDR(Number(c.netTotal))}
                    {c.payrollPeriodId
                      ? ` · period ${c.payrollPeriodId.slice(0, 8)}…`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{c.status}</Badge>
                  {c.payrollPeriodId ? (
                    <Link
                      href={`/payroll-engine/compare?periodId=${c.payrollPeriodId}`}
                      className="text-xs font-semibold text-primary"
                    >
                      Compare
                    </Link>
                  ) : null}
                  {c.payrollPeriodId ? (
                    <Link
                      href={`/payroll-engine/validations?periodId=${c.payrollPeriodId}&calculationId=${c.id}`}
                      className="text-xs font-semibold text-primary"
                    >
                      Validations
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition hover:border-primary/40">
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-xs text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 text-2xl font-semibold">{value}</CardContent>
      </Card>
    </Link>
  );
}
