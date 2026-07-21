"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CompanySelect } from "@/components/payroll-engine/company-select";

type Version = {
  id: string;
  version: number;
  expression: string;
  isActive: boolean;
  lifecycle: string;
  changeNote: string | null;
};
type Formula = {
  id: string;
  code: string;
  name: string;
  status: string;
  versions: Version[];
};

export function FormulasClient({
  defaultCompanyId,
}: {
  defaultCompanyId?: string | null;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [expression, setExpression] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await fetch(
      `/api/payroll/formulas?companyId=${encodeURIComponent(companyId)}`,
    );
    const data = (await res.json()) as { formulas?: Formula[]; error?: string };
    if (!res.ok) setError(data.error ?? "Load failed");
    else {
      setError("");
      setFormulas(data.formulas ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(activate: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payroll/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          code,
          name,
          expression,
          changeNote: note || undefined,
          activate,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Failed");
      else {
        setExpression("");
        setNote("");
        await load();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function activate(versionId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/payroll/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "activate", versionId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Activate failed");
      else await load();
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
          <CardTitle className="text-sm">
            New formula version (ACTIVE expressions are immutable)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="NetSalary"
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Expression</Label>
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Gross - Loan - BPJSEmployee - PPH21"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>Change note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              variant="outline"
              disabled={busy || !companyId || !code || !expression}
              onClick={() => void save(false)}
            >
              Save draft version
            </Button>
            <Button
              disabled={busy || !companyId || !code || !expression}
              onClick={() => void save(true)}
            >
              Save & activate
            </Button>
          </div>
        </CardContent>
      </Card>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-3">
        {formulas.map((f) => (
          <Card key={f.id}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm">
                {f.code} · {f.name}
              </CardTitle>
              <Badge variant="outline">{f.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {f.versions.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
                >
                  <div>
                    <span className="font-semibold">v{v.version}</span>{" "}
                    <code className="text-muted-foreground">{v.expression}</code>
                    {v.changeNote ? (
                      <p className="text-muted-foreground">{v.changeNote}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.isActive ? "secondary" : "outline"}>
                      {v.lifecycle || (v.isActive ? "ACTIVE" : "DRAFT")}
                    </Badge>
                    {!v.isActive && v.lifecycle !== "DEPRECATED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void activate(v.id)}
                      >
                        Activate
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
