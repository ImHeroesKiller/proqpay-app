"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCompactIDR } from "@/lib/format/idr";

export function AuditTrailClient({
  defaultPeriodId,
}: {
  defaultPeriodId?: string;
}) {
  const [periodId, setPeriodId] = useState(defaultPeriodId ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [trail, setTrail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch(
      `/api/payroll/audit-trail?payrollPeriodId=${encodeURIComponent(periodId)}&employeeId=${encodeURIComponent(employeeId)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      setTrail(null);
    } else setTrail(data);
  }

  const chain = trail?.chain as {
    attendance?: { totalOtHours: number; records: { date: string; type: string; ot: number }[] };
    calculation?: {
      runNumber: number;
      status: string;
      components: Record<string, number>;
      formulaSources: { code: string; expression: string | null; value: number }[];
    };
    tax?: { name: string; version: number; defaultTerRate: number };
    bpjs?: { name: string; version: number };
    projection?: { projected: boolean; projectedAt: string | null };
    payrollLine?: {
      baseSalary: number;
      allowances: number;
      overtime: number;
      tax: number;
      bpjs: number;
      netPay: number;
    };
  } | undefined;

  const emp = trail?.employee as
    | { name: string; code: string; baseSalary: number }
    | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder="Payroll period id"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
          <Input
            placeholder="Employee id"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
          <Button
            disabled={!periodId || !employeeId}
            onClick={() => void load()}
          >
            Trace employee
          </Button>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {trail && emp && chain ? (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {emp.code} · {emp.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Master base salary {formatCompactIDR(emp.baseSalary)}
            </CardContent>
          </Card>
          <Step title="1. Attendance" body={
            <>
              <p>OT hours in period: {chain.attendance?.totalOtHours ?? 0}</p>
              <ul className="mt-1 text-xs">
                {(chain.attendance?.records ?? []).slice(0, 10).map((r, i) => (
                  <li key={i}>
                    {String(r.date).slice(0, 10)} · {r.type} · OT {r.ot}
                  </li>
                ))}
              </ul>
            </>
          } />
          <Step title="2. Calculation" body={
            chain.calculation ? (
              <>
                <p>
                  Run #{chain.calculation.runNumber} · {chain.calculation.status}
                </p>
                <ul className="mt-1 font-mono text-xs">
                  {Object.entries(chain.calculation.components).map(([k, v]) => (
                    <li key={k}>
                      {k}: {formatCompactIDR(v)}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No calculation linked</p>
            )
          } />
          <Step title="3. Formula sources" body={
            <ul className="font-mono text-xs">
              {(chain.calculation?.formulaSources ?? []).map((f) => (
                <li key={f.code}>
                  {f.code} = {f.expression ?? "—"} → {formatCompactIDR(f.value)}
                </li>
              ))}
            </ul>
          } />
          <Step title="4. Tax" body={
            chain.tax ? (
              <p>
                {chain.tax.name} v{chain.tax.version} · TER{" "}
                {Number(chain.tax.defaultTerRate)}
              </p>
            ) : (
              <p>No tax snapshot</p>
            )
          } />
          <Step title="5. BPJS" body={
            chain.bpjs ? (
              <p>
                {chain.bpjs.name} v{chain.bpjs.version}
              </p>
            ) : (
              <p>No BPJS snapshot</p>
            )
          } />
          <Step title="6. Projection → PayrollLine" body={
            <>
              <p>
                Projected: {chain.projection?.projected ? "yes" : "no"}
                {chain.projection?.projectedAt
                  ? ` · ${String(chain.projection.projectedAt)}`
                  : ""}
              </p>
              {chain.payrollLine ? (
                <ul className="mt-1 text-xs">
                  <li>Base {formatCompactIDR(chain.payrollLine.baseSalary)}</li>
                  <li>Allowance {formatCompactIDR(chain.payrollLine.allowances)}</li>
                  <li>OT {formatCompactIDR(chain.payrollLine.overtime)}</li>
                  <li>Tax {formatCompactIDR(chain.payrollLine.tax)}</li>
                  <li>BPJS {formatCompactIDR(chain.payrollLine.bpjs)}</li>
                  <li className="font-semibold">
                    Net {formatCompactIDR(chain.payrollLine.netPay)}
                  </li>
                </ul>
              ) : (
                <p>No payroll line yet</p>
              )}
            </>
          } />
        </div>
      ) : null}
    </div>
  );
}

function Step({ title, body }: { title: string; body: ReactNode }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{body}</CardContent>
    </Card>
  );
}
