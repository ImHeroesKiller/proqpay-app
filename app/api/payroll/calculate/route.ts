import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { runPayrollCalculation } from "@/lib/payroll-engine/calculation-service";
import { validateAgainstBudget } from "@/lib/payroll-engine/budget-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    companyId: string;
    payrollPeriodId?: string;
    fundingModel?: "SELF_FUNDED" | "WORKING_CAPITAL";
    employees: {
      employeeId?: string;
      employeeCode?: string;
      employeeName: string;
      baseSalary: number;
      overtimeHours?: number;
      bonus?: number;
      loan?: number;
      active?: boolean;
    }[];
  };

  try {
    const budget = await validateAgainstBudget({
      companyId: body.companyId,
      totalNet: 0,
    });
    const result = await runPayrollCalculation({
      companyId: body.companyId,
      payrollPeriodId: body.payrollPeriodId,
      employees: body.employees,
      createdById: session.user.id,
      budgetAmount: budget.budgetAmount,
      fundingModel: body.fundingModel,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Calculate failed" },
      { status: 400 },
    );
  }
}
