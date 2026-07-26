import { formatRupiah } from "@/lib/utils";

type ComponentCostCardProps = { total: number };

export function ComponentCostCard({ total }: ComponentCostCardProps) {
  const items = [
    ["Gaji Pokok", 52],
    ["Tunjangan Transport", 14],
    ["Tunjangan Makan", 10],
    ["Lembur", 8],
    ["BPJS Ketenagakerjaan", 5],
  ];
  return (
    <section
      className="h-full rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]"
      aria-labelledby="component-cost-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="component-cost-title"
            className="text-sm font-bold uppercase tracking-[0.05em] text-navy"
          >
            Top Component Cost
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Komponen biaya terbesar
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-blue-600">
          Lihat semua
        </span>
      </div>
      <div className="mt-5 space-y-3.5">
        {items.map(([label, percent]) => (
          <div key={label as string}>
            <div className="mb-1.5 flex justify-between gap-3 text-xs leading-5">
              <span className="font-semibold text-navy">{label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatRupiah((total * Number(percent)) / 100)} · {percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#225cff] to-[#7430ef]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
