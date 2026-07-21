"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCompactIDR } from "@/lib/format/idr";

type ReceivableRow = {
  id: string;
  invoiceId: string;
  outstanding: string | number;
  originalAmount: string | number;
  currentBucket: string | null;
  agingDays: number;
  status: string;
  invoice?: {
    invoiceNumber: string | null;
    status: string;
    dueDate: string | null;
  } | null;
};

export function ReceivablesClient() {
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/financial/receivables");
      const data = (await res.json()) as {
        receivables?: ReceivableRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        setRows([]);
      } else {
        setRows(data.receivables ?? []);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Receivables (AR ledger)</CardTitle>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No receivables. Issue an invoice (status ISSUED) to open AR.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Invoice</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Outstanding</th>
                  <th className="px-2 py-2">Aging</th>
                  <th className="px-2 py-2">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2 font-medium">
                      {r.invoice?.invoiceNumber ?? r.invoiceId.slice(0, 8)}
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="secondary">{r.status}</Badge>
                    </td>
                    <td className="px-2 py-2">
                      {formatCompactIDR(Number(r.outstanding))}
                    </td>
                    <td className="px-2 py-2">{r.agingDays}d</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {r.currentBucket ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
