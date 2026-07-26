import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type PaymentStatusCardProps = {
  total: number;
  failed: number;
};

export function PaymentStatusCard({ total, failed }: PaymentStatusCardProps) {
  const paid = Math.max(total - failed, 0);
  const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;
  const pending = Math.max(total - paid, 0);

  return (
    <section
      className="h-full rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]"
      aria-labelledby="payment-status-title"
    >
      <h2
        id="payment-status-title"
        className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy"
      >
        Payment Status
      </h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Ringkasan pembayaran
      </p>
      <div className="mt-5 flex items-center gap-4">
        <div
          className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#13b981 0 ${paidPercent}%, #f59e0b ${paidPercent}% ${Math.min(paidPercent + 18, 100)}%, #ef4444 ${Math.min(paidPercent + 18, 100)}% 100%)`,
          }}
        >
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center">
            <strong className="text-2xl leading-none text-navy">
              {paidPercent}%
            </strong>
            <span className="mt-1 text-[10px] text-muted-foreground">Paid</span>
          </div>
        </div>
        <div className="min-w-0 space-y-2 text-[11px]">
          <p className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Paid{" "}
            <span className="ml-auto font-semibold text-navy">
              {formatRupiah(paid)}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-amber-700">
            <Clock3 className="h-3.5 w-3.5" /> Processing{" "}
            <span className="ml-auto font-semibold text-navy">
              {formatRupiah(pending)}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-red-600">
            <XCircle className="h-3.5 w-3.5" /> Failed{" "}
            <span className="ml-auto font-semibold text-navy">{failed}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
