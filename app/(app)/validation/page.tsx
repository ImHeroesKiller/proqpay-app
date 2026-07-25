export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { requireModule } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ValidationRunner } from "@/components/payroll/validation-runner";
import { formatDate } from "@/lib/utils";

export default async function ValidationPage() {
  await requireModule("validation");

  let periods: {
    id: string;
    name: string;
    status: string;
    periodStart: Date;
    employeeCount: number;
  }[] = [];
  let openIssues: {
    id: string;
    severity: string;
    code: string;
    message: string;
    payrollPeriodId: string;
  }[] = [];

  try {
    periods = await prisma.payrollPeriod.findMany({
      orderBy: { periodStart: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        status: true,
        periodStart: true,
        employeeCount: true,
      },
    });
    openIssues = await prisma.payrollValidationIssue.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        severity: true,
        code: true,
        message: true,
        payrollPeriodId: true,
      },
    });
  } catch {
    periods = [];
    openIssues = [];
  }

  return (
    <div>
      <PageHeader
        title="Validation Center"
        description="Deteksi anomali payroll sebelum approval: rekening, NPWP, BPJS, net pay, dan variance."
      />
      <div className="mb-6">
        <ValidationRunner periods={periods} />
      </div>
      <Card className="p-5">
        <h3 className="font-display text-base font-semibold text-navy">
          Isu terbuka ({openIssues.length})
        </h3>
        <div className="mt-4 space-y-2">
          {openIssues.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tidak ada isu terbuka. Jalankan validasi pada periode payroll.
            </p>
          )}
          {openIssues.map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
            >
              <div>
                <span
                  className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    i.severity === "CRITICAL"
                      ? "bg-red-100 text-red-800"
                      : i.severity === "WARNING"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {i.severity}
                </span>
                <span className="font-medium text-navy">{i.code}</span>
                <p className="mt-1 text-muted-foreground">{i.message}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Periode terbaru:{" "}
        {periods[0]
          ? `${periods[0].name} · ${formatDate(periods[0].periodStart)}`
          : "—"}
      </p>
    </div>
  );
}
