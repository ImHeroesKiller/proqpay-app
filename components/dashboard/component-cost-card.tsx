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
      <div className="flex items-start justify-between">
        <div>
          <h2
            id="component-cost-title"
            className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy"
          >
            Top Component Cost
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Komponen biaya terbesar
          </p>
        </div>
        <span className="text-[10px] font-semibold text-blue-600">
          Lihat semua
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {items.map(([label, percent]) => (
          <div key={label as string}>
            <div className="mb-1 flex justify-between gap-2 text-[11px]">
              <span className="font-medium text-navy">{label}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatRupiah((total * Number(percent)) / 100)} · {percent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
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
