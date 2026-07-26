import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type ClientPayrollRow = {
  id: string;
  clientName: string;
  projectName: string;
  employees: number;
  totalBruto: number;
  status: string;
  sla: number;
};

const statusStyle: Record<string, string> = {
  Approval: "bg-violet-100 text-violet-800",
  Validasi: "bg-amber-100 text-amber-800",
  Kalkulasi: "bg-sky-100 text-sky-800",
  Selesai: "bg-emerald-100 text-emerald-800",
  Pembayaran: "bg-orange/15 text-orange",
};

function mapStatus(raw: string): string {
  const s = raw.toUpperCase();
  if (["CLOSED", "DISBURSED", "VERIFIED"].includes(s)) return "Selesai";
  if (
    [
      "PAYMENT_INSTRUCTION_GENERATED",
      "WAITING_CLIENT_TRANSFER",
      "TRANSFER_PROOF_UPLOADED",
      "UNDER_VERIFICATION",
    ].includes(s)
  )
    return "Pembayaran";
  if (["WAITING", "APPROVED"].includes(s) && s === "APPROVED") return "Approval";
  if (s === "WAITING") return "Kalkulasi";
  if (s === "DRAFT") return "Validasi";
  if (s.includes("APPROV") || s === "LOCKED") return "Approval";
  return "Validasi";
}

export function ClientPayrollTable({ rows }: { rows: ClientPayrollRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada data client / project untuk ditampilkan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-3 pr-4 font-semibold">Client / Project</th>
            <th className="pb-3 pr-4 font-semibold">Karyawan</th>
            <th className="pb-3 pr-4 font-semibold">Total Payroll (Bruto)</th>
            <th className="pb-3 pr-4 font-semibold">Status</th>
            <th className="pb-3 font-semibold">SLA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = mapStatus(row.status);
            return (
              <tr
                key={row.id}
                className="border-b border-border/60 last:border-0"
              >
                <td className="py-3.5 pr-4">
                  <p className="font-semibold text-navy">{row.clientName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.projectName}
                  </p>
                </td>
                <td className="py-3.5 pr-4 tabular-nums font-medium text-navy">
                  {row.employees.toLocaleString("id-ID")}
                </td>
                <td className="py-3.5 pr-4 tabular-nums font-medium text-navy">
                  {formatRupiah(row.totalBruto)}
                </td>
                <td className="py-3.5 pr-4">
                  <Badge
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold hover:opacity-90",
                      statusStyle[status] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {status}
                  </Badge>
                </td>
                <td className="py-3.5">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      row.sla >= 90
                        ? "text-emerald-600"
                        : row.sla >= 75
                          ? "text-amber-600"
                          : "text-red-600",
                    )}
                  >
                    {row.sla}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
