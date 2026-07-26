import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { companyWhere } from "@/lib/auth/scope";

export async function GET(request: Request) {
  const scope = await requireSession();
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: query, mode: "insensitive" as const };
  const companyFilter = companyWhere(scope);
  const [employees, periods, invoices] = await Promise.all([
    prisma.employee.findMany({
      where: { ...companyFilter, OR: [{ name: contains }, { employeeCode: contains }] },
      select: { id: true, name: true, employeeCode: true }, take: 5,
    }),
    prisma.payrollPeriod.findMany({
      where: { ...companyFilter, name: contains },
      select: { id: true, name: true }, take: 5,
    }),
    prisma.invoice.findMany({
      where: { ...companyFilter, invoiceNumber: contains },
      select: { id: true, invoiceNumber: true }, take: 5,
    }),
  ]);

  return NextResponse.json({
    results: [
      ...employees.map((item) => ({ id: item.id, label: item.name, detail: `Karyawan · ${item.employeeCode}`, href: `/employees/${item.id}` })),
      ...periods.map((item) => ({ id: item.id, label: item.name, detail: "Payroll period", href: `/payroll/${item.id}` })),
      ...invoices.map((item) => ({ id: item.id, label: item.invoiceNumber, detail: "Invoice", href: `/billing` })),
    ],
  });
}
