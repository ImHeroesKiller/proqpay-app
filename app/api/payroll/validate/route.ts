import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { prisma } from "@/lib/db";
import {
  runValidationRules,
  type EmployeeCalcRow,
} from "@/lib/payroll-engine/validation-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const calculationId = new URL(req.url).searchParams.get("calculationId");
  if (!calculationId) {
    return NextResponse.json({ error: "calculationId required" }, { status: 400 });
  }
  const validations = await prisma.payrollValidation.findMany({
    where: { calculationId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ validations });
}

/** Re-run pure validation from stored items (no recompute formulas). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { calculationId: string };
  const items = await prisma.payrollCalculationItem.findMany({
    where: { calculationId: body.calculationId },
  });
  const byEmp = new Map<string, EmployeeCalcRow>();
  for (const it of items) {
    const key = it.employeeId ?? it.employeeCode ?? it.employeeName;
    const row = byEmp.get(key) ?? {
      employeeId: it.employeeId,
      employeeCode: it.employeeCode,
      employeeName: it.employeeName,
      values: {},
    };
    row.values[it.componentCode] = Number(it.finalValue.toString());
    byEmp.set(key, row);
  }
  const employees = [...byEmp.values()];
  const calc = await prisma.payrollCalculation.findUnique({
    where: { id: body.calculationId },
  });
  const issues = runValidationRules({
    employees,
    totalNet: calc ? Number(calc.netTotal.toString()) : undefined,
  });
  return NextResponse.json({ issues });
}
