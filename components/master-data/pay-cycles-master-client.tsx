"use client";

import { useState } from "react";
import { MasterDataCrudShell } from "@/components/master-data/master-data-crud";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PayCyclesMasterClient({ canManage }: { canManage: boolean }) {
  const [previewId, setPreviewId] = useState("");
  const [preview, setPreview] = useState<
    { periodStart: string; periodEnd: string; paymentDueAt: string }[] | null
  >(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function loadPreview() {
    setPreviewError(null);
    if (!previewId.trim()) {
      setPreviewError("Enter a pay cycle id");
      return;
    }
    const res = await fetch(
      `/api/master-data/pay-cycles?id=${encodeURIComponent(previewId.trim())}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setPreviewError(data.error || "Failed");
      setPreview(null);
      return;
    }
    setPreview(
      (data.preview ?? []).map(
        (p: {
          periodStart: string;
          periodEnd: string;
          paymentDueAt: string;
        }) => ({
          periodStart: String(p.periodStart).slice(0, 10),
          periodEnd: String(p.periodEnd).slice(0, 10),
          paymentDueAt: String(p.paymentDueAt).slice(0, 10),
        }),
      ),
    );
  }

  return (
    <div className="space-y-6">
      <MasterDataCrudShell
        title="Pay cycles"
        description="Defines period windows for payroll groups."
        endpoint="/api/master-data/pay-cycles"
        canManage={canManage}
        emptyTitle="No pay cycles"
        columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "company", label: "Client" },
          { key: "frequency", label: "Frequency" },
          { key: "cutoffDay", label: "Cutoff day" },
          { key: "paymentDay", label: "Payment day" },
          { key: "status", label: "Status" },
        ]}
        createFields={[
          { key: "companyId", label: "Company ID", required: true },
          { key: "code", label: "Code", required: true },
          { key: "name", label: "Name", required: true },
          {
            key: "frequency",
            label: "Frequency",
            placeholder: "MONTHLY|WEEKLY|BIWEEKLY|SEMIMONTHLY|CUSTOM",
            required: true,
          },
          { key: "cutoffDay", label: "Cutoff day", type: "number" },
          { key: "paymentDay", label: "Payment day", type: "number" },
          { key: "approvalLagDays", label: "Approval lag days", type: "number" },
          {
            key: "customConfig",
            label: "Custom config JSON",
            placeholder: '{"periodDays":14}',
          },
        ]}
        mapRow={(item) => {
          const company = item.company as { name?: string } | undefined;
          return {
            code: String(item.code ?? ""),
            name: String(item.name ?? ""),
            company: String(company?.name ?? ""),
            frequency: String(item.frequency ?? ""),
            cutoffDay: String(item.cutoffDay ?? ""),
            paymentDay: String(item.paymentDay ?? ""),
            status: String(item.status ?? ""),
          };
        }}
        buildCreateBody={(form) => ({
          companyId: form.companyId,
          code: form.code,
          name: form.name,
          frequency: form.frequency || "MONTHLY",
          cutoffDay: form.cutoffDay ? Number(form.cutoffDay) : 25,
          paymentDay: form.paymentDay ? Number(form.paymentDay) : 28,
          approvalLagDays: form.approvalLagDays
            ? Number(form.approvalLagDays)
            : 2,
          customConfig: form.customConfig || null,
        })}
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Schedule preview</h3>
          <p className="text-sm text-muted-foreground">
            Enter a pay cycle UUID to preview the next periods.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-9 min-w-[280px] flex-1 rounded-md border bg-background px-3 text-sm"
              value={previewId}
              onChange={(e) => setPreviewId(e.target.value)}
              placeholder="Pay cycle id"
            />
            <Button type="button" onClick={() => void loadPreview()}>
              Preview
            </Button>
          </div>
          {previewError ? (
            <p className="text-sm text-destructive">{previewError}</p>
          ) : null}
          {preview ? (
            <ul className="space-y-1 text-sm">
              {preview.map((p, i) => (
                <li key={i} className="rounded border px-2 py-1">
                  {p.periodStart} → {p.periodEnd} · pay {p.paymentDueAt}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
