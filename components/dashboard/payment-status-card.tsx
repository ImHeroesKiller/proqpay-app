import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type PaymentStatusCardProps = {
  total: number;
  failed: number;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function labelPosition(start: number, size: number, radius = 47) {
  const angle = ((start + size / 2) / 100) * Math.PI * 2 - Math.PI / 2;
  return {
    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
  };
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

  const segments = [
    { label: Math.round(paidPercent), start: 0, size: paidPercent },
    { label: Math.round(processingPercent), start: paidEnd, size: processingPercent },
    { label: Math.round(failedPercent), start: processingEnd, size: failedPercent },
  ].filter((segment) => segment.size >= 4);

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

      <div className="mt-4 flex items-center gap-5">
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
          {segments.map((segment) => (
            <span
              key={`${segment.start}-${segment.size}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold leading-none text-white drop-shadow-sm"
              style={labelPosition(segment.start, segment.size)}
            >
              {segment.label}%
            </span>
          ))}
          <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white text-center shadow-inner">
            <div>
              <strong className="text-xl font-extrabold leading-none tracking-[-0.03em] text-navy">
                {Math.round(paidPercent)}%
              </strong>
              <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
                Paid
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-[11px]">
          <p className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium">Paid</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(paidAmount)}
            </span>
          </p>
          <p className="flex items-center gap-2 text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="font-medium">Processing</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(processingAmount)}
            </span>
          </p>
          <p className="flex items-center gap-2 text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            <span className="font-medium">Failed</span>
            <span className="ml-auto truncate font-semibold tabular-nums text-navy">
              {formatRupiah(failedAmount)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="font-medium text-muted-foreground">Total payroll</span>
        <strong className="text-sm font-bold tabular-nums text-navy">{formatRupiah(total)}</strong>
      </div>
    </section>
  );
}
