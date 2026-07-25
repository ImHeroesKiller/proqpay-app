export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatRupiah, formatDate } from "@/lib/utils";
import { maskAccountNumber } from "@/lib/security/mask";
import Link from "next/link";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  await requireModule("payroll");
  const sp = await searchParams;

  let periods: { id: string; name: string; status: string; periodStart: Date }[] = [];
  let lines: {
    id: string;
    employeeName: string;
    department: string;
    baseSalary: unknown;
    allowances: unknown;
    overtime: unknown;
    bonuses: unknown;
    deductions: unknown;
    bpjs: unknown;
    tax: unknown;
    netPay: unknown;
    employee: { employeeCode: string; bankAccount: string; bankName: string };
  }[] = [];
  let selectedName = "";

  try {
    periods = await prisma.payrollPeriod.findMany({
      orderBy: { periodStart: "desc" },
      take: 30,
      select: { id: true, name: true, status: true, periodStart: true },
    });
    const periodId = sp.periodId ?? periods[0]?.id;
    if (periodId) {
      const period = periods.find((p) => p.id === periodId);
      selectedName = period?.name ?? "";
      lines = await prisma.payrollLine.findMany({
        where: { payrollPeriodId: periodId },
        include: {
          employee: {
            select: { employeeCode: true, bankAccount: true, bankName: true },
          },
        },
        orderBy: { employeeName: "asc" },
      });
    }
  } catch {
    periods = [];
    lines = [];
  }

  const periodId = sp.periodId ?? periods[0]?.id;

  return (
    <div>
      <PageHeader
        title="Payroll Register"
        description="Register rincian gaji per periode. Unduh CSV via Reports API bila tersedia."
        actions={
          periodId ? (
            <Link
              href={`/api/reports/payroll-register?periodId=${periodId}`}
              className="inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium"
            >
              Unduh CSV
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Link
            key={p.id}
            href={`/register?periodId=${p.id}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              p.id === periodId
                ? "border-orange bg-orange/10 text-navy"
                : "border-border text-muted-foreground"
            }`}
          >
            {p.name} · {p.status}
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold text-navy">
          {selectedName || "Register"} · {lines.length} baris
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-2">Kode</th>
                <th className="py-2 pr-2">Nama</th>
                <th className="py-2 pr-2">Dept</th>
                <th className="py-2 pr-2">Pokok</th>
                <th className="py-2 pr-2">Tunjangan</th>
                <th className="py-2 pr-2">Lembur</th>
                <th className="py-2 pr-2">Potongan</th>
                <th className="py-2 pr-2">BPJS</th>
                <th className="py-2 pr-2">PPh21</th>
                <th className="py-2 pr-2">Net</th>
                <th className="py-2">Bank</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    Tidak ada baris untuk periode ini.
                  </td>
                </tr>
              )}
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-border/60">
                  <td className="py-2 pr-2 font-medium">{l.employee.employeeCode}</td>
                  <td className="py-2 pr-2">{l.employeeName}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{l.department}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.baseSalary))}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.allowances))}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.overtime))}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.deductions))}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.bpjs))}</td>
                  <td className="py-2 pr-2">{formatRupiah(Number(l.tax))}</td>
                  <td className="py-2 pr-2 font-semibold text-navy">
                    {formatRupiah(Number(l.netPay))}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {l.employee.bankName} {maskAccountNumber(l.employee.bankAccount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Data sensitif dimasking. Periode terbaru:{" "}
          {periods[0] ? formatDate(periods[0].periodStart) : "—"}
        </p>
      </Card>
    </div>
  );
}
