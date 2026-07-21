"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CompanySelect } from "@/components/payroll-engine/company-select";
import { formatCompactIDR } from "@/lib/format/idr";

type Row = {
  id: string;
  name: string;
  version: number;
  lifecycle: string;
  isActive: boolean;
  kesehatanEmployee: string | number;
  kesehatanEmployer: string | number;
  jhtEmployee: string | number;
  jhtEmployer: string | number;
  maxWageKesehatan: string | number;
  maxWageJp: string | number;
  effectiveFrom: string;
  changeNote: string | null;
};

export function BpjsConfigClient({
  defaultCompanyId,
}: {
  defaultCompanyId?: string | null;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("BPJS Profile");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await fetch(
      `/api/payroll/bpjs-config?companyId=${encodeURIComponent(companyId)}`,
    );
    const data = (await res.json()) as { configs?: Row[]; error?: string };
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
      const res = await fetch("/api/payroll/bpjs-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name,
          changeNote: note || undefined,
          activate: true,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Failed");
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
      <CompanySelect
        value={companyId}
        onChange={setCompanyId}
        defaultCompanyId={defaultCompanyId}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New BPJS version</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Change note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button disabled={busy || !companyId} onClick={() => void createVersion()}>
              Create & activate (standard rates)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Creates a versioned BPJS Kesehatan + TK profile with standard Indonesian
            employee/employer shares and wage ceilings. Prior active version is deprecated.
          </p>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">BPJS versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
            >
              <div>
                <p className="font-semibold">
                  v{r.version} · {r.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Kes emp {Number(r.kesehatanEmployee)} / er{" "}
                  {Number(r.kesehatanEmployer)} · JHT emp{" "}
                  {Number(r.jhtEmployee)} · ceiling{" "}
                  {formatCompactIDR(Number(r.maxWageKesehatan))}
                </p>
              </div>
              <Badge variant={r.isActive ? "secondary" : "outline"}>
                {r.lifecycle}
              </Badge>
            </div>
          ))}
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No BPJS configs yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
