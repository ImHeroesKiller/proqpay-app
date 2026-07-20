export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompactIDR } from "@/lib/format/idr";

export default async function PayrollEnginePage() {
  await requireModule("payroll");

  const [components, formulas, calculations, simulations, budgets] =
    await Promise.all([
      prisma.payrollComponent.findMany({
        take: 20,
        orderBy: { sortOrder: "asc" },
      }).catch(() => []),
      prisma.payrollFormula.findMany({
        take: 20,
        include: { versions: { where: { isActive: true }, take: 1 } },
        orderBy: { code: "asc" },
      }).catch(() => []),
      prisma.payrollCalculation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          validations: { take: 5 },
          approvals: { include: { steps: { orderBy: { level: "asc" } } } },
          journal: true,
          revisions: { orderBy: { revisionNumber: "desc" }, take: 3 },
        },
      }).catch(() => []),
      prisma.payrollSimulation.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      prisma.payrollBudget.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
    ]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Payroll Engine"
        title="Enterprise Payroll Engine"
        description="Metadata-driven components, formulas, calculation runs, validation, simulation, approval timeline, revisions, and journals. Legacy payroll periods remain operational."
        actions={
          <Link
            href="/payroll"
            className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-semibold shadow-sm"
          >
            Open operational payroll
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payroll Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {components.length === 0 ? (
              <p className="text-muted-foreground">
                No components yet. Use API POST /api/payroll/components or seed
                master data.
              </p>
            ) : (
              components.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold">{c.code}</p>
                    <p className="text-muted-foreground">{c.name}</p>
                  </div>
                  <Badge variant="secondary">{c.kind}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Formulas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {formulas.length === 0 ? (
              <p className="text-muted-foreground">
                No company formulas. Engine falls back to default component
                graph (BasicSalary, allowances, BPJS, PPh21, NetSalary).
              </p>
            ) : (
              formulas.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-border/70 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {f.code} · {f.name}
                    </p>
                    <Badge variant="outline">{f.status}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {f.versions[0]?.expression ?? "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calculation Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No engine runs yet. POST /api/payroll/calculate to create a
              versioned calculation with snapshot, journal, and approval chain.
            </p>
          ) : (
            calculations.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-border/70 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    Run {run.id.slice(0, 8)} · rev {run.revision}
                  </p>
                  <Badge>{run.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Employees {run.employeeCount} · Gross{" "}
                  {formatCompactIDR(Number(run.grossTotal))} · Net{" "}
                  {formatCompactIDR(Number(run.netTotal))} · WC req{" "}
                  {formatCompactIDR(Number(run.workingCapitalRequirement))}
                </p>

                {run.validations.length > 0 ? (
                  <div className="mt-3">
                    <p className="font-semibold">Validation</p>
                    <ul className="mt-1 space-y-1">
                      {run.validations.map((v) => (
                        <li key={v.id} className="text-muted-foreground">
                          [{v.severity}] {v.code}: {v.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {run.approvals[0] ? (
                  <div className="mt-3">
                    <p className="font-semibold">Approval timeline</p>
                    <ol className="mt-1 space-y-1">
                      {run.approvals[0].steps.map((s) => (
                        <li key={s.id}>
                          L{s.level} {s.roleLabel} — {s.status}
                          {s.comment ? ` · ${s.comment}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {run.revisions.length > 0 ? (
                  <div className="mt-3">
                    <p className="font-semibold">Revisions</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {run.revisions.map((r) => (
                        <li key={r.id}>
                          Rev {r.revisionNumber}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {run.journal ? (
                  <div className="mt-3 grid gap-1 sm:grid-cols-2">
                    <p>
                      Journal gross{" "}
                      {formatCompactIDR(Number(run.journal.grossPayroll))}
                    </p>
                    <p>
                      Journal net{" "}
                      {formatCompactIDR(Number(run.journal.netPayroll))}
                    </p>
                    <p>
                      BPJS employer{" "}
                      {formatCompactIDR(Number(run.journal.bpjsEmployer))}
                    </p>
                    <p>
                      Tax {formatCompactIDR(Number(run.journal.taxTotal))}
                    </p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Simulations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {simulations.length === 0 ? (
              <p className="text-muted-foreground">
                No simulations. POST /api/payroll/simulate for what-if scenarios
                (does not mutate operational payroll).
              </p>
            ) : (
              simulations.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border/70 px-3 py-2"
                >
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-muted-foreground">
                    Net {formatCompactIDR(Number(s.netTotal))} · WC{" "}
                    {formatCompactIDR(Number(s.workingCapitalRequirement))} ·
                    Margin Δ {formatCompactIDR(Number(s.marginImpact))}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Budgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {budgets.length === 0 ? (
              <p className="text-muted-foreground">
                No budgets. POST /api/payroll/budget to define company/client
                limits.
              </p>
            ) : (
              budgets.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between rounded-xl border border-border/70 px-3 py-2"
                >
                  <span className="font-semibold">{b.name}</span>
                  <span>{formatCompactIDR(Number(b.amount))}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
