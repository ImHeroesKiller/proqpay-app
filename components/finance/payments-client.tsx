"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCompactIDR } from "@/lib/format/idr";

type PaymentRow = {
  id: string;
  amount: string | number;
  status: string;
  paymentDate: string;
  companyId: string;
  bankReference: string | null;
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  outstandingAmount: string | number;
  grandTotal: string | number;
};

export function PaymentsClient({
  organizationId,
  companyId,
}: {
  organizationId?: string | null;
  companyId?: string | null;
}) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [invoiceId, setInvoiceId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [pRes, iRes] = await Promise.all([
        fetch("/api/financial/payments"),
        fetch("/api/financial/invoices"),
      ]);
      const pData = (await pRes.json()) as {
        payments?: PaymentRow[];
        error?: string;
      };
      const iData = (await iRes.json()) as {
        invoices?: InvoiceOption[];
        error?: string;
      };
      if (!pRes.ok) setError(pData.error ?? "Payments load failed");
      else setPayments(pData.payments ?? []);
      if (iRes.ok) {
        setInvoices(
          (iData.invoices ?? []).filter((i) =>
            ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status),
          ),
        );
      }
    } catch {
      setError("Network error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPayment() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          organizationId: organizationId ?? undefined,
          companyId: companyId ?? undefined,
          amount: Number(amount),
          paymentDate,
        }),
      });
      const data = (await res.json()) as { payment?: PaymentRow; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Create failed");
      } else {
        setAmount("");
        await load();
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function verifyAndAllocate(payment: PaymentRow) {
    if (!invoiceId) {
      setError("Select an open invoice to allocate");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          paymentId: payment.id,
          allocations: [
            { invoiceId, amount: Number(payment.amount) },
          ],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verify failed");
      } else {
        await load();
        router.refresh();
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
          <CardTitle className="text-sm">Record client payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="pay-amount">Amount (IDR)</Label>
            <Input
              id="pay-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100000000"
            />
          </div>
          <div>
            <Label htmlFor="pay-date">Payment date</Label>
            <Input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={busy || !amount}
              onClick={() => void createPayment()}
            >
              {busy ? "Saving…" : "Create payment"}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive sm:col-span-3">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payments</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="alloc-inv">Invoice for allocation (on verify)</Label>
            <select
              id="alloc-inv"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">Select open invoice…</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {(inv.invoiceNumber ?? inv.id.slice(0, 8)) +
                    ` · ${inv.status} · out ${formatCompactIDR(Number(inv.outstandingAmount))}`}
                </option>
              ))}
            </select>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2">
                        {String(p.paymentDate).slice(0, 10)}
                      </td>
                      <td className="px-2 py-2">
                        {formatCompactIDR(Number(p.amount))}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="secondary">{p.status}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {p.status === "PENDING" ? (
                          <Button
                            size="sm"
                            variant="accent"
                            disabled={busy}
                            onClick={() => void verifyAndAllocate(p)}
                          >
                            Verify + allocate
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
