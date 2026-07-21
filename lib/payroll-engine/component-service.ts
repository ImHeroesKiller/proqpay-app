import { prisma } from "@/lib/db";
import type { ComponentCalcMethod, PayrollComponentKind } from "@prisma/client";

export async function listComponents(companyId: string) {
  return prisma.payrollComponent.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

export async function upsertComponent(input: {
  companyId: string;
  code: string;
  name: string;
  kind: PayrollComponentKind;
  calcMethod?: ComponentCalcMethod;
  defaultAmount?: number;
  percentRate?: number | null;
  isTaxable?: boolean;
  categoryCode?: string | null;
  calculationType?: string | null;
  formulaExpression?: string | null;
  bpjsApplicable?: boolean;
  isSystem?: boolean;
  isEditable?: boolean;
  sortOrder?: number;
}) {
  return prisma.payrollComponent.upsert({
    where: {
      companyId_code: { companyId: input.companyId, code: input.code },
    },
    create: {
      companyId: input.companyId,
      code: input.code,
      name: input.name,
      kind: input.kind,
      calcMethod: input.calcMethod ?? "FIXED",
      defaultAmount: input.defaultAmount ?? 0,
      percentRate: input.percentRate ?? null,
      isTaxable: input.isTaxable ?? true,
      categoryCode: input.categoryCode ?? null,
      calculationType: input.calculationType ?? "FIXED",
      formulaExpression: input.formulaExpression ?? null,
      bpjsApplicable: input.bpjsApplicable ?? false,
      isSystem: input.isSystem ?? false,
      isEditable: input.isEditable ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      name: input.name,
      kind: input.kind,
      calcMethod: input.calcMethod,
      defaultAmount: input.defaultAmount,
      percentRate: input.percentRate,
      isTaxable: input.isTaxable,
      categoryCode: input.categoryCode,
      calculationType: input.calculationType,
      formulaExpression: input.formulaExpression,
      bpjsApplicable: input.bpjsApplicable,
      isEditable: input.isEditable,
      sortOrder: input.sortOrder,
    },
  });
}

export async function listCategories(companyId?: string | null) {
  return prisma.payrollComponentCategory.findMany({
    where: companyId
      ? { OR: [{ companyId }, { companyId: null }] }
      : { companyId: null },
    orderBy: { displayOrder: "asc" },
  });
}

/** Seed system categories (idempotent). */
export async function ensureSystemCategories() {
  const system = [
    ["BASIC_SALARY", "Basic Salary", 10],
    ["ALLOWANCE", "Allowance", 20],
    ["DEDUCTION", "Deduction", 30],
    ["TAX", "Tax", 40],
    ["BPJS", "BPJS", 50],
    ["OVERTIME", "Overtime", 60],
    ["ATTENDANCE", "Attendance", 70],
    ["LEAVE", "Leave", 80],
    ["BONUS", "Bonus", 90],
    ["THR", "THR", 100],
    ["LOAN", "Loan", 110],
    ["REIMBURSEMENT", "Reimbursement", 120],
    ["ADJUSTMENT", "Adjustment", 130],
    ["EMPLOYER_COST", "Employer Cost", 140],
    ["OTHER", "Other", 150],
  ] as const;

  for (const [code, name, order] of system) {
    const existing = await prisma.payrollComponentCategory.findFirst({
      where: { companyId: null, code },
    });
    if (!existing) {
      await prisma.payrollComponentCategory.create({
        data: {
          companyId: null,
          code,
          name,
          displayOrder: order,
          isSystem: true,
        },
      });
    }
  }
}
