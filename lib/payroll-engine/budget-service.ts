import { prisma } from "@/lib/db";
import type { BudgetScopeType } from "@prisma/client";

export async function createPayrollBudget(input: {
  companyId: string;
  name: string;
  amount: number;
  scopeType?: BudgetScopeType;
  scopeId?: string | null;
  periodLabel?: string | null;
  allocations?: { label: string; amount: number }[];
}) {
  return prisma.payrollBudget.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      amount: input.amount,
      scopeType: input.scopeType ?? "COMPANY",
      scopeId: input.scopeId ?? null,
      periodLabel: input.periodLabel ?? null,
      allocations: input.allocations?.length
        ? {
            create: input.allocations.map((a) => ({
              label: a.label,
              amount: a.amount,
            })),
          }
        : undefined,
    },
    include: { allocations: true },
  });
}

export async function validateAgainstBudget(input: {
  companyId: string;
  totalNet: number;
}): Promise<{ ok: boolean; budgetAmount: number | null; message?: string }> {
  const budget = await prisma.payrollBudget.findFirst({
    where: { companyId: input.companyId, active: true, scopeType: "COMPANY" },
    orderBy: { createdAt: "desc" },
  });
  if (!budget) return { ok: true, budgetAmount: null };
  const amount = Number(budget.amount.toString());
  if (input.totalNet > amount + 0.0001) {
    return {
      ok: false,
      budgetAmount: amount,
      message: `Net payroll exceeds budget ${amount}`,
    };
  }
  return { ok: true, budgetAmount: amount };
}

export async function listBudgets(companyId: string) {
  return prisma.payrollBudget.findMany({
    where: { companyId },
    include: { allocations: true },
    orderBy: { createdAt: "desc" },
  });
}
