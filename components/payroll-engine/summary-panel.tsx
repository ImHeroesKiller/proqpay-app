"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompactIDR } from "@/lib/format/idr";

export function PayrollSummaryPanel({ periodId }: { periodId: string }) {
  const [data, setData] = useState<{
    totals: Record<string, number>;
    validation: { status: string; openBlockersAndErrors: number };
    revision: { latestRunNumber: number; runCount: number; projectedRunNumber: number | null };
    period: { status: string };
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/payroll/summary?payrollPeriodId=${encodeURIComponent(periodId)}`,
      );
      if (res.ok) setData(await res.json());
    })();
  }, [periodId]);

  if (!data) {
    return (
      <p className="mb-4 text-sm text-muted-foreground">Loading summary…</p>
    );
  }

  const t = data.totals;
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Gross payroll" value={formatCompactIDR(t.grossPayroll)} />
      <Kpi label="Net payroll" value={formatCompactIDR(t.netPayroll)} />
      <Kpi label="Total tax" value={formatCompactIDR(t.totalTax)} />
      <Kpi label="BPJS employee" value={formatCompactIDR(t.totalBpjsEmployee)} />
      <Kpi label="Allowances" value={formatCompactIDR(t.totalAllowance)} />
      <Kpi label="Deductions" value={formatCompactIDR(t.totalDeduction)} />
      <Kpi label="Employees" value={String(t.totalEmployees)} />
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Validation / revision
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 text-sm">
          <Badge variant="secondary">{data.validation.status}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            Open issues: {data.validation.openBlockersAndErrors}
          </p>
          <p className="text-xs text-muted-foreground">
            Runs: {data.revision.runCount} · latest #{data.revision.latestRunNumber}
            {data.revision.projectedRunNumber != null
              ? ` · projected #${data.revision.projectedRunNumber}`
              : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
