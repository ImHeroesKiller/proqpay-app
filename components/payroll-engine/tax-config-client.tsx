"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CompanySelect } from "@/components/payroll-engine/company-select";

type TaxRow = {
  id: string;
  name: string;
  version: number;
  lifecycle: string;
  isActive: boolean;
  method: string;
  defaultTerRate: string | number;
  nonNpwpSurcharge: string | number;
  effectiveFrom: string;
  ptkpJson: string | null;
  changeNote: string | null;
};

export function TaxConfigClient({
  defaultCompanyId,
}: {
  defaultCompanyId?: string | null;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("TER Profile");
  const [ter, setTer] = useState("0.05");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await fetch(
      `/api/payroll/tax-config?companyId=${encodeURIComponent(companyId)}`,
    );
    const data = (await res.json()) as { configs?: TaxRow[]; error?: string };
    if (!res.ok) setError(data.error ?? "Load failed");
    else {
      setError("");
      setRows(data.configs ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createVersion() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payroll/tax-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name,
          defaultTerRate: Number(ter),
          changeNote: note || undefined,
          activate: true,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Create failed");
      else {
        setNote("");
        await load();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Company</Label>
        <CompanySelect
          value={companyId}
          onChange={setCompanyId}
          defaultCompanyId={defaultCompanyId}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New tax version (immutable activate)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>TER rate (0–1)</Label>
            <Input value={ter} onChange={(e) => setTer(e.target.value)} />
          </div>
          <div>
            <Label>Change note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <Button disabled={busy || !companyId} onClick={() => void createVersion()}>
              {busy ? "Saving…" : "Create & activate version"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tax config versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No tax configs — create one before payroll run.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <div>
                  <p className="font-semibold">
                    v{r.version} · {r.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    TER {Number(r.defaultTerRate)} · method {r.method} · from{" "}
                    {String(r.effectiveFrom).slice(0, 10)}
                  </p>
                  {r.changeNote ? (
                    <p className="text-xs text-muted-foreground">{r.changeNote}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.isActive ? "secondary" : "outline"}>
                    {r.lifecycle}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
