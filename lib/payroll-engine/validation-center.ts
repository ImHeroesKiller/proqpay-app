/**
 * Validation Center — list, resolve, re-run validations (Increment 1.5).
 */

import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import {
  hasBlockers,
  runValidationRules,
  type EmployeeCalcRow,
} from "@/lib/payroll-engine/validation-engine";

const SUGGESTIONS: Record<string, string> = {
  ZERO_NET: "Review base salary, deductions, and attendance OT inputs",
  NEGATIVE_NET: "Check loan/deduction amounts exceeding gross",
  BLOCKER: "Resolve blocking issues before approval",
  FORMULA_ERROR: "Fix formula expression in Formula Management",
  BUDGET: "Adjust budget allocation or payroll totals",
  INACTIVE: "Remove inactive employees from population",
  MISSING: "Ensure employee master data is complete",
};

export function suggestedActionFor(code: string, message: string): string {
  for (const [k, v] of Object.entries(SUGGESTIONS)) {
    if (code.includes(k) || message.toUpperCase().includes(k)) return v;
  }
  if (code.includes("BLOCKER") || code.includes("ERROR")) {
    return "Review employee calculation detail and re-run payroll";
  }
  return "Review and resolve or ignore after business confirmation";
}

export async function listValidations(opts: {
  calculationId?: string;
  payrollPeriodId?: string;
  severity?: string;
  resolutionStatus?: string;
  q?: string;
  companyId?: string;
}) {
  let calculationIds: string[] | undefined;
  if (opts.payrollPeriodId) {
    const calcs = await prisma.payrollCalculation.findMany({
      where: { payrollPeriodId: opts.payrollPeriodId },
      select: { id: true },
      orderBy: { runNumber: "desc" },
      take: 20,
    });
    calculationIds = calcs.map((c) => c.id);
  }

  return prisma.payrollValidation.findMany({
    where: {
      ...(opts.calculationId
        ? { calculationId: opts.calculationId }
        : calculationIds
          ? { calculationId: { in: calculationIds } }
          : {}),
      ...(opts.severity
        ? { severity: opts.severity as never }
        : {}),
      ...(opts.resolutionStatus
        ? { resolutionStatus: opts.resolutionStatus }
        : {}),
      ...(opts.q
        ? {
            OR: [
              { message: { contains: opts.q, mode: "insensitive" } },
              { employeeName: { contains: opts.q, mode: "insensitive" } },
              { code: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
      calculation: opts.companyId
        ? { companyId: opts.companyId }
        : undefined,
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      calculation: {
        select: {
          id: true,
          runNumber: true,
          revision: true,
          status: true,
          payrollPeriodId: true,
        },
      },
    },
  });
}

export async function resolveValidation(
  scope: SessionScope,
  validationId: string,
  action: "RESOLVED" | "IGNORED",
  note?: string,
) {
  const row = await prisma.payrollValidation.findUnique({
    where: { id: validationId },
    include: { calculation: true },
  });
  if (!row) throw new Error("Validation not found");
  if (!assertCompanyAccess(scope, row.calculation.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (row.resolutionStatus !== "OPEN") {
    throw new Error("Validation already closed");
  }
  return prisma.payrollValidation.update({
    where: { id: validationId },
    data: {
      resolutionStatus: action,
      resolvedAt: new Date(),
      resolvedById: scope.userId,
      resolutionNote: note ?? null,
    },
  });
}

/** Re-run validation rules against existing calculation items (does not recompute formulas). */
export async function rerunValidation(scope: SessionScope, calculationId: string) {
  const calc = await prisma.payrollCalculation.findUnique({
    where: { id: calculationId },
    include: { items: true },
  });
  if (!calc) throw new Error("Calculation not found");
  if (!assertCompanyAccess(scope, calc.companyId)) {
    throw new Error("Cross-company access denied");
  }

  // Group items by employee
  const byEmp = new Map<string, EmployeeCalcRow>();
  for (const it of calc.items) {
    const key = it.employeeId ?? it.employeeName;
    const cur = byEmp.get(key) ?? {
      employeeId: it.employeeId,
      employeeCode: it.employeeCode,
      employeeName: it.employeeName,
      active: true,
      values: {},
    };
    cur.values[it.componentCode] = Number(it.finalValue);
    byEmp.set(key, cur);
  }

  const issues = runValidationRules({
    employees: [...byEmp.values()],
    totalNet: Number(calc.netTotal),
    minSalary: 0,
    approvalReady: true,
  });

  // Mark old open as superseded via note; create new rows
  await prisma.payrollValidation.updateMany({
    where: { calculationId, resolutionStatus: "OPEN" },
    data: {
      resolutionStatus: "RESOLVED",
      resolutionNote: "Superseded by re-run validation",
      resolvedAt: new Date(),
      resolvedById: scope.userId,
    },
  });

  if (issues.length) {
    await prisma.payrollValidation.createMany({
      data: issues.map((iss) => ({
        calculationId,
        code: iss.code,
        severity: iss.severity,
        message: iss.message,
        employeeId: iss.employeeId ?? null,
        employeeName: iss.employeeName ?? null,
        suggestedAction: suggestedActionFor(iss.code, iss.message),
        resolutionStatus: "OPEN",
      })),
    });
  }

  const blockers = hasBlockers(issues);
  if (blockers && calc.status === "READY_FOR_APPROVAL") {
    await prisma.payrollCalculation.update({
      where: { id: calculationId },
      data: { status: "FAILED", errorMessage: "Re-validation blockers present" },
    });
  }

  return {
    calculationId,
    issueCount: issues.length,
    blockers,
  };
}

export function groupValidationsBySeverity<
  T extends { severity: string },
>(rows: T[]) {
  return {
    blockers: rows.filter((r) => r.severity === "BLOCKER"),
    errors: rows.filter((r) => r.severity === "ERROR"),
    warnings: rows.filter((r) => r.severity === "WARNING"),
    info: rows.filter((r) => r.severity === "INFO"),
  };
}
