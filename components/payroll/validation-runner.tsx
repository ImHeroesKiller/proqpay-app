"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { runValidationAction } from "@/lib/validation/actions";

export function ValidationRunner({
  periods,
}: {
  periods: { id: string; name: string; status: string; employeeCount: number }[];
}) {
  const [selected, setSelected] = useState(periods[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Periode payroll
        </label>
        <select
          className="mt-1 block h-10 min-w-[240px] rounded-xl border border-border bg-[#F7F8FC] px-3 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.status} · {p.employeeCount} karyawan
            </option>
          ))}
        </select>
      </div>
      <Button
        disabled={!selected || pending}
        onClick={() =>
          start(async () => {
            const res = await runValidationAction(selected);
            setMsg(
              res.ok
                ? `Validasi selesai: ${res.critical} kritis, ${res.warning} peringatan (${res.total} total).`
                : res.error,
            );
            if (res.ok) window.location.reload();
          })
        }
      >
        Jalankan validasi
      </Button>
      {msg && <p className="w-full text-sm text-navy">{msg}</p>}
    </div>
  );
}
