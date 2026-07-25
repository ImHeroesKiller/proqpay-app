export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRupiah, formatDate } from "@/lib/utils";
import { maskAccountNumber } from "@/lib/security/mask";
import { PayslipGenerator } from "@/components/payroll/payslip-generator";

export default async function PayslipsPage() {
  await requireModule("payroll");

  let payslips: {
    id: string;
    payslipNumber: string;
    issuedAt: Date | null;
    employee: { name: string; employeeCode: string; bankAccount: string };
    payrollPeriod: { name: string };
    payloadJson: unknown;
  }[] = [];
  let periods: { id: string; name: string; status: string }[] = [];

  try {
    payslips = await prisma.payslip.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        employee: { select: { name: true, employeeCode: true, bankAccount: true } },
        payrollPeriod: { select: { name: true } },
      },
    });
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
    payslips = [];
    periods = [];
  }

  return (
    <div>
      <PageHeader
        title="Payslip"
        description="Slip gaji per karyawan dengan breakdown komponen. Data rekening ditampilkan ter-masking."
      />
      <PayslipGenerator periods={periods} />
      <Card className="mt-6 p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Nomor</th>
                <th className="py-2 pr-3">Karyawan</th>
                <th className="py-2 pr-3">Periode</th>
                <th className="py-2 pr-3">Rekening</th>
                <th className="py-2 pr-3">Net pay</th>
                <th className="py-2">Terbit</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada payslip. Generate dari periode yang sudah disetujui.
                  </td>
                </tr>
              )}
              {payslips.map((p) => {
                const payload = (p.payloadJson ?? {}) as { netPay?: number };
                return (
                  <tr key={p.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium text-navy">{p.payslipNumber}</td>
                    <td className="py-3 pr-3">
                      {p.employee.name}
                      <div className="text-xs text-muted-foreground">
                        {p.employee.employeeCode}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{p.payrollPeriod.name}</td>
                    <td className="py-3 pr-3">
                      {maskAccountNumber(p.employee.bankAccount)}
                    </td>
                    <td className="py-3 pr-3 font-medium">
                      {formatRupiah(Number(payload.netPay ?? 0))}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {p.issuedAt ? formatDate(p.issuedAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
