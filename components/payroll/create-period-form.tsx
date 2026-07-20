"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function CreatePeriodForm() {
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<{
    schedule: {
      periodStart: string;
      periodEnd: string;
      cutoffAt: string;
      approvalDueAt: string;
      paymentDueAt: string;
    };
    population: number;
    warnings: string[];
    group: { code: string; name: string; status: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPreview() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/master-data/payroll-periods?payrollGroupId=${encodeURIComponent(groupId)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview({
        schedule: {
          periodStart: String(data.schedule.periodStart).slice(0, 10),
          periodEnd: String(data.schedule.periodEnd).slice(0, 10),
          cutoffAt: String(data.schedule.cutoffAt),
          approvalDueAt: String(data.schedule.approvalDueAt).slice(0, 10),
          paymentDueAt: String(data.schedule.paymentDueAt).slice(0, 10),
        },
        population: data.population,
        warnings: data.warnings ?? [],
        group: {
          code: data.group.code,
          name: data.group.name,
          status: data.group.status,
        },
      });
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/master-data/payroll-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollGroupId: groupId,
          name: name || undefined,
          allowEmptyPopulation: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setResult(
        `Created period ${data.period.name} (${data.period.id}) · population ${data.population}`,
      );
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-5">
      <CardContent className="space-y-3 p-4">
        <h2 className="font-semibold">Create payroll period</h2>
        <p className="text-sm text-muted-foreground">
          Select a payroll group. Pay cycle, cutoff, approval, and payment dates
          are calculated from the group&apos;s pay cycle. New periods cannot be
          created without this context.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Payroll group ID *</span>
            <Input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder="UUID of active payroll group"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Name (optional)</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto from group + month if empty"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !groupId}
            onClick={() => void onPreview()}
          >
            Preview schedule
          </Button>
          <Button
            type="button"
            disabled={busy || !groupId}
            onClick={() => void onCreate()}
          >
            Create period
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {result ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{result}</p>
        ) : null}
        {preview ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">
              {preview.group.code} — {preview.group.name} ({preview.group.status})
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Period: {preview.schedule.periodStart} → {preview.schedule.periodEnd}
              </li>
              <li>Cutoff: {preview.schedule.cutoffAt}</li>
              <li>Approval due: {preview.schedule.approvalDueAt}</li>
              <li>Payment due: {preview.schedule.paymentDueAt}</li>
              <li>Population: {preview.population}</li>
            </ul>
            {preview.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-400">
                {preview.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
