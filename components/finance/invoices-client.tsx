"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompactIDR } from "@/lib/format/idr";

type InvoiceRow = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  grandTotal: string | number;
  outstandingAmount: string | number;
  paidAmount?: string | number;
  currency: string;
  dueDate: string | null;
  companyId: string;
  payrollPeriodId: string | null;
  createdAt: string;
};

const NEXT_ACTIONS: Record<string, { to: string; label: string }[]> = {
  DRAFT: [
    { to: "PENDING_APPROVAL", label: "Submit approval" },
    { to: "CANCELLED", label: "Cancel" },
  ],
  PENDING_APPROVAL: [
    { to: "APPROVED", label: "Approve" },
    { to: "DRAFT", label: "Return draft" },
  ],
  APPROVED: [{ to: "ISSUED", label: "Issue (create AR)" }],
  ISSUED: [],
  PARTIALLY_PAID: [],
  OVERDUE: [],
  PAID: [],
  VOID: [],
  CANCELLED: [],
};

export function InvoicesClient() {
  const router = useRouter();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/financial/invoices");
      const data = (await res.json()) as { invoices?: InvoiceRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load invoices");
        setRows([]);
      } else {
        setRows(data.invoices ?? []);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(id: string, to: string) {
    setBusy(`${id}:${to}`);
    setError("");
    try {
      const res = await fetch(`/api/financial/invoices/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Transition failed");
      } else {
        await load();
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Client invoices</CardTitle>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices yet. Create a draft from an eligible payroll period
            (Payroll detail → Create invoice), then approve and issue to open AR.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Number</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Outstanding</th>
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const actions = NEXT_ACTIONS[inv.status] ?? [];
                  return (
                    <tr key={inv.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2 font-medium">
                        {inv.invoiceNumber ?? (
                          <span className="text-muted-foreground">Draft</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary">{inv.status}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {formatCompactIDR(Number(inv.grandTotal))}
                      </td>
                      <td className="px-2 py-2">
                        {formatCompactIDR(Number(inv.outstandingAmount))}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {inv.payrollPeriodId
                          ? inv.payrollPeriodId.slice(0, 8) + "…"
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {actions.map((a) => (
                            <Button
                              key={a.to}
                              size="sm"
                              variant={a.to === "ISSUED" ? "accent" : "outline"}
                              disabled={!!busy}
                              onClick={() => void transition(inv.id, a.to)}
                            >
                              {busy === `${inv.id}:${a.to}` ? "…" : a.label}
                            </Button>
                          ))}
                          {actions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
