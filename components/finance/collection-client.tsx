"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Activity = {
  id: string;
  activityType: string;
  summary: string;
  performedAt: string;
  companyId: string;
  invoiceId: string | null;
};

export function CollectionClient({ companyId }: { companyId?: string | null }) {
  const [rows, setRows] = useState<Activity[]>([]);
  const [summary, setSummary] = useState("");
  const [activityType, setActivityType] = useState("CALL");
  const [invoiceId, setInvoiceId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/financial/collection");
      const data = (await res.json()) as {
        activities?: Activity[];
        error?: string;
      };
      if (!res.ok) setError(data.error ?? "Load failed");
      else setRows(data.activities ?? []);
    } catch {
      setError("Network error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logActivity() {
    if (!companyId) {
      setError("Session company required to log collection activity");
      return;
    }
    if (!summary.trim()) {
      setError("Summary required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/financial/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          invoiceId: invoiceId || undefined,
          activityType,
          summary: summary.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Failed");
      else {
        setSummary("");
        await load();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Log collection activity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              {["CALL", "EMAIL", "MEETING", "REMINDER", "ESCALATION", "NOTE", "OTHER"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <Label>Invoice ID (optional)</Label>
            <Input
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="UUID"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Summary</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Called finance contact re: overdue invoice…"
            />
          </div>
          <div>
            <Button disabled={busy} onClick={() => void logActivity()}>
              {busy ? "Saving…" : "Log activity"}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive sm:col-span-2">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent activities</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rows.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-border/70 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{a.activityType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {String(a.performedAt).slice(0, 19).replace("T", " ")}
                    </span>
                  </div>
                  <p className="mt-1">{a.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
