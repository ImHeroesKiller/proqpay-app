"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Val = {
  id: string;
  code: string;
  severity: string;
  message: string;
  employeeName: string | null;
  suggestedAction: string | null;
  resolutionStatus: string;
  calculation?: { runNumber: number; id: string };
};

export function ValidationCenterClient({
  defaultPeriodId,
  defaultCalculationId,
}: {
  defaultPeriodId?: string;
  defaultCalculationId?: string;
}) {
  const [periodId, setPeriodId] = useState(defaultPeriodId ?? "");
  const [calculationId, setCalculationId] = useState(
    defaultCalculationId ?? "",
  );
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [rows, setRows] = useState<Val[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (periodId) params.set("payrollPeriodId", periodId);
    if (calculationId) params.set("calculationId", calculationId);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/payroll/validations?${params}`);
    const data = (await res.json()) as {
      validations?: Val[];
      error?: string;
    };
    if (!res.ok) setError(data.error ?? "Load failed");
    else {
      setError("");
      setRows(data.validations ?? []);
    }
  }, [periodId, calculationId, status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, resolution: "RESOLVED" | "IGNORED") {
    setBusy(true);
    try {
      const res = await fetch("/api/payroll/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          validationId: id,
          resolution,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Failed");
      else await load();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function rerun() {
    if (!calculationId) {
      setError("calculationId required to re-run");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/payroll/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rerun", calculationId }),
      });
      const data = (await res.json()) as { error?: string; issueCount?: number };
      if (!res.ok) setError(data.error ?? "Failed");
      else {
        setError("");
        await load();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  const sevColor = (s: string) => {
    if (s === "BLOCKER" || s === "ERROR") return "danger" as const;
    if (s === "WARNING") return "warning" as const;
    return "outline" as const;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <Input
            placeholder="Payroll period UUID"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
          <Input
            placeholder="Calculation UUID"
            value={calculationId}
            onChange={(e) => setCalculationId(e.target.value)}
          />
          <Input
            placeholder="Search employee / rule"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="h-10 rounded-lg border bg-card px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
            <option value="">All</option>
          </select>
          <div className="flex gap-2 sm:col-span-4">
            <Button variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
            <Button disabled={busy || !calculationId} onClick={() => void rerun()}>
              Re-run validation
            </Button>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Issues ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No validations match filters.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={sevColor(r.severity)}>{r.severity}</Badge>
                  <Badge variant="outline">{r.code}</Badge>
                  <span className="font-medium">
                    {r.employeeName ?? "—"}
                  </span>
                  {r.calculation ? (
                    <span className="text-xs text-muted-foreground">
                      run #{r.calculation.runNumber}
                    </span>
                  ) : null}
                  <Badge variant="secondary">{r.resolutionStatus}</Badge>
                </div>
                <p className="mt-1">{r.message}</p>
                {r.suggestedAction ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Suggested: {r.suggestedAction}
                  </p>
                ) : null}
                {r.resolutionStatus === "OPEN" ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void resolve(r.id, "RESOLVED")}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void resolve(r.id, "IGNORED")}
                    >
                      Ignore
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
