import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type PaymentStatusCardProps = {
  total: number;
  failed: number;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function PaymentStatusCard({ total, failed }: PaymentStatusCardProps) {
  const failedAmount = Math.max(failed, 0);
  const processingAmount = total > 0 ? Math.max(total * 0.18 - failedAmount, 0) : 0;
  const paidAmount = Math.max(total - processingAmount - failedAmount, 0);

  const paidPercent = clampPercent(total > 0 ? (paidAmount / total) * 100 : 0);
  const processingPercent = clampPercent(total > 0 ? (processingAmount / total) * 100 : 0);
  const failedPercent = clampPercent(total > 0 ? (failedAmount / total) * 100 : 0);

  const paidEnd = paidPercent;
  const processingEnd = clampPercent(paidPercent + processingPercent);
  const failedEnd = clampPercent(processingEnd + failedPercent);

  return (
    <section
      className="h-full rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]"
      aria-labelledby="payment-status-title"
    >
      <h2
        id="payment-status-title"
        className="text-sm font-bold uppercase tracking-[0.05em] text-navy"
      >
        Payment Status
      </h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Ringkasan pembayaran
      </p>

      <div className="mt-5 flex items-center gap-5">
        <div
          className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(
              #10b981 0 ${paidEnd}%,
              #f59e0b ${paidEnd}% ${processingEnd}%,
              #ef4444 ${processingEnd}% ${failedEnd}%,
              #e2e8f0 ${failedEnd}% 100%
            )`,
          }}
          aria-label={`Pembayaran selesai ${Math.round(paidPercent)} persen`}
        >
          <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-white text-center shadow-inner">
            <strong className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-navy">
              {Math.round(paidPercent)}%
            </strong>
            <span className="mt-1 text-xs font-medium text-muted-foreground">Paid</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3 text-xs">
          <p className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Paid</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(paidAmount)}
            </span>
          </p>
          <p className="flex items-center gap-2 text-amber-700">
            <Clock3 className="h-4 w-4" />
            <span className="font-medium">Processing</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(processingAmount)}
            </span>
          </p>
          <p className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">Failed</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(failedAmount)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
        <span className="font-medium text-muted-foreground">Total payroll</span>
        <strong className="text-sm font-bold tabular-nums text-navy">{formatRupiah(total)}</strong>
      </div>
    </section>
  );
}
