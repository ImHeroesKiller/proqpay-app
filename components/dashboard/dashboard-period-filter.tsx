"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const presets = [
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "quarter", label: "Kuartalan" },
  { value: "year", label: "Tahunan" },
  { value: "custom", label: "Rentang tanggal" },
] as const;

export function DashboardPeriodFilter({
  preset,
  start,
  end,
}: {
  preset: string;
  start: string;
  end: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <select
        aria-label="Pilih periode dashboard"
        value={preset}
        disabled={pending}
        onChange={(event) => update({ range: event.target.value, start: undefined, end: undefined })}
        className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-navy outline-none"
      >
        {presets.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={start}
        disabled={pending}
        onChange={(event) => update({ range: "custom", start: event.target.value })}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-navy outline-none"
        aria-label="Tanggal awal dashboard"
      />
      <span className="text-xs text-slate-400">s.d.</span>
      <input
        type="date"
        value={end}
        disabled={pending}
        onChange={(event) => update({ range: "custom", end: event.target.value })}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-navy outline-none"
        aria-label="Tanggal akhir dashboard"
      />
      {pending ? <span className="px-2 text-[11px] text-slate-500">Memuat data…</span> : null}
    </div>
  );
}
