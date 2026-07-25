export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { listInvoices } from "@/lib/billing/actions";
import { prisma } from "@/lib/db";
import { formatRupiah, formatDate } from "@/lib/utils";
import { BillingActions } from "@/components/billing/billing-actions";

export default async function BillingPage() {
  await requireModule("billing");

  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let periods: { id: string; name: string; status: string }[] = [];
  try {
    invoices = await listInvoices();
    periods = await prisma.payrollPeriod.findMany({
      where: {
        status: {
          in: [
            "APPROVED",
            "LOCKED",
            "DISBURSED",
            "PAYMENT_INSTRUCTION_GENERATED",
            "CLOSED",
          ],
        },
      },
      orderBy: { periodStart: "desc" },
      take: 20,
      select: { id: true, name: true, status: true },
    });
  } catch {
    invoices = [];
    periods = [];
  }

  return (
    <div>
      <PageHeader
        title="Billing & Invoice"
        description="Draft invoice berbasis payroll: managed payroll, BPJS employer, management fee, dan PPN."
      />
      <BillingActions periods={periods} />
      <Card className="mt-6 p-5">
        <h3 className="font-display text-base font-semibold text-navy">Daftar invoice</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Nomor</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Jatuh tempo</th>
                <th className="py-2 pr-3">Management fee</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada invoice. Buat draft dari periode payroll yang sudah disetujui.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/70">
                  <td className="py-3 pr-3 font-medium text-navy">{inv.invoiceNumber}</td>
                  <td className="py-3 pr-3">{inv.company?.name ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{inv.status}</span>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                  </td>
                  <td className="py-3 pr-3">{formatRupiah(Number(inv.managementFee))}</td>
                  <td className="py-3 font-medium">{formatRupiah(Number(inv.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
