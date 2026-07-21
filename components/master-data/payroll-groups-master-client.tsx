"use client";

import { useState } from "react";
import { MasterDataCrudShell } from "@/components/master-data/master-data-crud";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PayrollGroupsMasterClient({
  canManage,
}: {
  canManage: boolean;
}) {
  const [detailId, setDetailId] = useState("");
  const [detail, setDetail] = useState<{
    group: Record<string, unknown>;
    population: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail() {
    setError(null);
    if (!detailId.trim()) {
      setError("Enter payroll group id");
      return;
    }
    const res = await fetch(
      `/api/master-data/payroll-groups?id=${encodeURIComponent(detailId.trim())}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setDetail(null);
      return;
    }
    setDetail({ group: data.group, population: data.population });
  }

  return (
    <div className="space-y-6">
      <MasterDataCrudShell
        title="Payroll groups"
        description="Defines who is paid together and which cycle applies."
        endpoint="/api/master-data/payroll-groups"
        canManage={canManage}
        emptyTitle="No payroll groups"
        columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "company", label: "Client" },
          { key: "cycle", label: "Pay cycle" },
          { key: "site", label: "Site" },
          { key: "status", label: "Status" },
          { key: "assignments", label: "Assignments" },
        ]}
        createFields={[
          { key: "companyId", label: "Company ID", required: true },
          { key: "payCycleId", label: "Pay cycle ID", required: true },
          { key: "code", label: "Code", required: true },
          { key: "name", label: "Name", required: true },
          { key: "projectId", label: "Project ID" },
          { key: "siteId", label: "Site ID" },
          { key: "currency", label: "Currency", placeholder: "IDR" },
        ]}
        mapRow={(item) => {
          const company = item.company as { name?: string } | undefined;
          const cycle = item.payCycle as { code?: string } | undefined;
          const site = item.site as { code?: string } | undefined;
          const count = item._count as { assignments?: number } | undefined;
          return {
            code: String(item.code ?? ""),
            name: String(item.name ?? ""),
            company: String(company?.name ?? ""),
            cycle: String(cycle?.code ?? ""),
            site: String(site?.code ?? "—"),
            status: String(item.status ?? ""),
            assignments: String(count?.assignments ?? 0),
          };
        }}
        buildCreateBody={(form) => ({
          companyId: form.companyId,
          payCycleId: form.payCycleId,
          code: form.code,
          name: form.name,
          projectId: form.projectId || null,
          siteId: form.siteId || null,
          currency: form.currency || "IDR",
        })}
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Group detail</h3>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-9 min-w-[280px] flex-1 rounded-md border bg-background px-3 text-sm"
              value={detailId}
              onChange={(e) => setDetailId(e.target.value)}
              placeholder="Payroll group id"
            />
            <Button type="button" onClick={() => void loadDetail()}>
              Load
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {detail ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name: </span>
                {String(detail.group.name)} ({String(detail.group.code)})
              </p>
              <p>
                <span className="text-muted-foreground">Status: </span>
                <Badge variant="secondary">{String(detail.group.status)}</Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Active population: </span>
                {detail.population}
              </p>
              <p className="text-muted-foreground">
                Periods shown:{" "}
                {Array.isArray(detail.group.payrollPeriods)
                  ? detail.group.payrollPeriods.length
                  : 0}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canManage ? (
        <AssignEmployeeForm
          defaultGroupId={detailId}
          onAssigned={() => {
            if (detailId) void loadDetail();
          }}
        />
      ) : null}
    </div>
  );
}

function AssignEmployeeForm({
  defaultGroupId,
  onAssigned,
}: {
  defaultGroupId: string;
  onAssigned: () => void;
}) {
  const [payrollGroupId, setPayrollGroupId] = useState(defaultGroupId);
  const [employeeId, setEmployeeId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function assign() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/master-data/payroll-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          payrollGroupId: payrollGroupId || defaultGroupId,
          employeeId,
          effectiveFrom,
        }),
      });
      const data = (await res.json()) as { error?: string; assignment?: { id: string } };
      if (!res.ok) {
        setError(data.error || "Assign failed");
      } else {
        setOk(`Assigned · ${data.assignment?.id?.slice(0, 8) ?? "ok"}`);
        setEmployeeId("");
        onAssigned();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="font-semibold">Assign employee to group</h3>
        <p className="text-xs text-muted-foreground">
          Effective-dated membership. Overlapping active assignments for the same
          employee are rejected by the service.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={payrollGroupId || defaultGroupId}
            onChange={(e) => setPayrollGroupId(e.target.value)}
            placeholder="Payroll group UUID"
          />
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Employee UUID"
          />
          <input
            type="date"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={busy || !employeeId || !(payrollGroupId || defaultGroupId)}
          onClick={() => void assign()}
        >
          {busy ? "Assigning…" : "Assign employee"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {ok ? <p className="text-sm text-muted-foreground">{ok}</p> : null}
      </CardContent>
    </Card>
  );
}
