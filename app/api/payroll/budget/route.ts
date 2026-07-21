import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  createPayrollBudget,
  listBudgets,
} from "@/lib/payroll-engine/budget-service";
import type { BudgetScopeType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId =
    new URL(req.url).searchParams.get("companyId") ?? session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const budgets = await listBudgets(companyId);
  return NextResponse.json({ budgets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "payroll") || role === "CLIENT" || role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    companyId: string;
    name: string;
    amount: number;
    scopeType?: BudgetScopeType;
    periodLabel?: string;
  };
  try {
    const budget = await createPayrollBudget(body);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Budget failed" },
      { status: 400 },
    );
  }
}
