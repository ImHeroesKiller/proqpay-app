import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Payroll register CSV export — extends Reports module (no duplicate page). */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const periodId = url.searchParams.get("periodId");

  const period = periodId
    ? await prisma.payrollPeriod.findUnique({
        where: { id: periodId },
        include: { lines: true, company: true },
      })
    : await prisma.payrollPeriod.findFirst({
        orderBy: { periodStart: "desc" },
        include: { lines: true, company: true },
      });

  if (!period) {
    return NextResponse.json({ error: "No period" }, { status: 404 });
  }

  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.companyId &&
    period.companyId !== session.user.companyId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const header = [
    "period",
    "company",
    "employee_name",
    "department",
    "base_salary",
    "allowances",
    "overtime",
    "bonuses",
    "deductions",
    "bpjs_employee",
    "pph21",
    "net_pay",
  ].join(",");

  const rows = period.lines.map((l) =>
    [
      period.name,
      period.company.name,
      `"${l.employeeName}"`,
      l.department,
      Number(l.baseSalary).toFixed(2),
      Number(l.allowances).toFixed(2),
      Number(l.overtime).toFixed(2),
      Number(l.bonuses).toFixed(2),
      Number(l.deductions).toFixed(2),
      Number(l.bpjs).toFixed(2),
      Number(l.tax).toFixed(2),
      Number(l.netPay).toFixed(2),
    ].join(","),
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-register-${period.name.replace(/\s+/g, "-")}.csv"`,
    },
  });
}
