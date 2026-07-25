"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generatePayslipsAction } from "@/lib/payroll/client-actions";

export function PayslipGenerator({
  periods,
}: {
  periods: { id: string; name: string; status: string }[];
}) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Periode</label>
        <select
          className="mt-1 block h-10 min-w-[260px] rounded-xl border bg-[#F7F8FC] px-3 text-sm"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.status}
            </option>
          ))}
        </select>
      </div>
      <Button
        disabled={!periodId || pending}
        onClick={() =>
          start(async () => {
            const res = await generatePayslipsAction(periodId);
            setMsg(res.ok ? `${res.created} payslip dibuat.` : res.error);
            if (res.ok) window.location.reload();
          })
        }
      >
        Generate payslip
      </Button>
      {msg && <p className="w-full text-sm text-navy">{msg}</p>}
    </div>
  );
}
