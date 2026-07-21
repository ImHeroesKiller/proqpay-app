"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCompactIDR } from "@/lib/format/idr";

type Run = {
  id: string;
  runNumber: number;
  status: string;
  netTotal: string | number;
  grossTotal: string | number;
  calculatedAt: string | null;
  runReason: string | null;
};

export function CompareClient({ defaultPeriodId }: { defaultPeriodId?: string }) {
  const [periodId, setPeriodId] = useState(defaultPeriodId ?? "");
  const [runs, setRuns] = useState<Run[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<{
    runA: Run & { id: string };
    runB: Run & { id: string };
    totals: { netDelta: number; grossDelta: number; changedEmployees: number };
    employees: {
      employeeName: string;
      netChanged: boolean;
      deltas: Record<string, { a: number; b: number; delta: number; changed: boolean }>;
    }[];
  } | null>(null);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    if (!periodId) return;
    const res = await fetch(
      `/api/payroll/compare?payrollPeriodId=${encodeURIComponent(periodId)}`,
    );
    const data = (await res.json()) as { runs?: Run[]; error?: string };
    if (!res.ok) setError(data.error ?? "Failed");
    else {
      setRuns(data.runs ?? []);
      if (data.runs && data.runs.length >= 2) {
        setB(data.runs[0]!.id);
        setA(data.runs[1]!.id);
      } else if (data.runs?.[0]) {
        setB(data.runs[0].id);
        setA(data.runs[0].id);
      }
    }
  }, [periodId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  async function compare() {
    setError("");
    const res = await fetch(
      `/api/payroll/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
    );
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Compare failed");
    else setResult(data);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder="Payroll period id"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
          <select
            className="h-10 rounded-lg border bg-card px-3 text-sm"
            value={a}
            onChange={(e) => setA(e.target.value)}
          >
            <option value="">Run A…</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.runNumber} · {r.status} ·{" "}
                {formatCompactIDR(Number(r.netTotal))}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border bg-card px-3 text-sm"
            value={b}
            onChange={(e) => setB(e.target.value)}
          >
            <option value="">Run B…</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run #{r.runNumber} · {r.status} ·{" "}
                {formatCompactIDR(Number(r.netTotal))}
              </option>
            ))}
          </select>
          <div className="flex gap-2 sm:col-span-3">
            <Button variant="outline" onClick={() => void loadRuns()}>
              Load runs
            </Button>
            <Button disabled={!a || !b} onClick={() => void compare()}>
              Compare A vs B
            </Button>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Net delta (B−A)</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCompactIDR(result.totals.netDelta)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gross delta</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCompactIDR(result.totals.grossDelta)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Employees changed</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {result.totals.changedEmployees}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Per employee (Net / Tax / BPJS)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Employee</th>
                    <th>Net A</th>
                    <th>Net B</th>
                    <th>Δ Net</th>
                    <th>Δ Tax</th>
                    <th>Δ BPJS</th>
                    <th>Δ Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {result.employees
                    .filter((e) => e.netChanged)
                    .slice(0, 50)
                    .map((e) => (
                      <tr key={e.employeeName} className="border-b border-border/50">
                        <td className="py-1.5 font-medium">{e.employeeName}</td>
                        <td>{formatCompactIDR(e.deltas.NetSalary?.a ?? 0)}</td>
                        <td>{formatCompactIDR(e.deltas.NetSalary?.b ?? 0)}</td>
                        <td className={e.deltas.NetSalary?.changed ? "font-semibold" : ""}>
                          {formatCompactIDR(e.deltas.NetSalary?.delta ?? 0)}
                        </td>
                        <td>{formatCompactIDR(e.deltas.PPH21?.delta ?? 0)}</td>
                        <td>
                          {formatCompactIDR(e.deltas.BPJSEmployee?.delta ?? 0)}
                        </td>
                        <td>{formatCompactIDR(e.deltas.Gross?.delta ?? 0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {result.employees.filter((e) => e.netChanged).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No net salary differences between runs.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
