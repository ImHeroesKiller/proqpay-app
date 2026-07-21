"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ExceptionRow = {
  id: string;
  rowNumber: number;
  code: string;
  message: string;
  severity: string;
  status: string;
  employeeCode: string | null;
  workDate: string | null;
};

type PeriodOpt = { id: string; name: string; status: string };

export function AttendanceImportPanel({
  periods,
}: {
  periods: PeriodOpt[];
}) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);

  const loadExceptions = useCallback(async () => {
    if (!periodId) return;
    const res = await fetch(
      `/api/attendance/exceptions?payrollPeriodId=${encodeURIComponent(periodId)}&status=OPEN`,
    );
    const data = (await res.json()) as { exceptions?: ExceptionRow[] };
    if (res.ok) setExceptions(data.exceptions ?? []);
  }, [periodId]);

  useEffect(() => {
    void loadExceptions();
  }, [loadExceptions]);

  async function onImport() {
    if (!file || !periodId) {
      setError("Select period and CSV file");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("payrollPeriodId", periodId);
      fd.set("autoCommit", "true");
      const res = await fetch("/api/attendance/import", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        idempotent?: boolean;
        batch?: { successRows?: number; exceptionRows?: number; status?: string };
        message?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setInfo(
          data.idempotent
            ? data.message ?? "Re-import skipped (same file)"
            : `Imported · success ${data.batch?.successRows ?? 0} · exceptions ${data.batch?.exceptionRows ?? 0} · ${data.batch?.status}`,
        );
        setFile(null);
        await loadExceptions();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function resolve(id: string, action: "RESOLVED" | "IGNORED") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exceptionId: id, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Failed");
      else await loadExceptions();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="mb-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Import attendance CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Columns:{" "}
            <code className="text-xs">
              employee_code, work_date, type, hours_worked, overtime_hours,
              project_code, site_code, notes
            </code>
            . Valid rows stage then commit; errors go to the exception queue.
            Re-uploading the same file is idempotent.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">Payroll period</span>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">Select…</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="block w-full text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button disabled={busy || !file || !periodId} onClick={() => void onImport()}>
            {busy ? "Importing…" : "Import & commit"}
          </Button>
          {error ? <p className="text-destructive">{error}</p> : null}
          {info ? <p className="text-muted-foreground">{info}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Exception queue (open)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void loadExceptions()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open exceptions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {exceptions.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-xl border border-border/70 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">row {ex.rowNumber}</Badge>
                    <Badge variant="secondary">{ex.code}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {ex.employeeCode} · {ex.workDate}
                    </span>
                  </div>
                  <p className="mt-1">{ex.message}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void resolve(ex.id, "IGNORED")}
                    >
                      Ignore
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void resolve(ex.id, "RESOLVED")}
                    >
                      Mark resolved
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
