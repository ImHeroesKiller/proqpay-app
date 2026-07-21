/**
 * Pre-projection verification gate (Increment 1.5).
 */

import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import { projectCalculationToPayrollLines } from "@/lib/payroll-engine/project-to-lines";

export type VerifyResult = {
  ok: boolean;
  checks: { code: string; ok: boolean; message: string }[];
};

export async function verifyProjectionReadiness(
  scope: SessionScope,
  periodId: string,
  calculationId: string,
): Promise<VerifyResult> {
  const checks: VerifyResult["checks"] = [];

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });
  if (!period) {
    return {
      ok: false,
      checks: [{ code: "PERIOD", ok: false, message: "Period not found" }],
    };
  }
  if (!assertCompanyAccess(scope, period.companyId)) {
    return {
      ok: false,
      checks: [
        { code: "TENANT", ok: false, message: "Cross-company access denied" },
      ],
    };
  }

  checks.push({
    code: "PERIOD_NOT_LOCKED",
    ok: !["LOCKED", "CLOSED", "DISBURSED", "VERIFIED"].includes(period.status),
    message:
      period.status === "LOCKED"
        ? "Period is locked"
        : `Period status is ${period.status}`,
  });

  checks.push({
    code: "PERIOD_APPROVED",
    ok: period.status === "APPROVED" || period.status === "LOCKED",
    message:
      period.status === "APPROVED"
        ? "Period is APPROVED"
        : `Period must be APPROVED (current: ${period.status})`,
  });

  const calc = await prisma.payrollCalculation.findUnique({
    where: { id: calculationId },
    include: {
      _count: { select: { validations: true } },
    },
  });
  if (!calc) {
    checks.push({
      code: "CALCULATION",
      ok: false,
      message: "Calculation not found",
    });
    return { ok: false, checks };
  }

  checks.push({
    code: "CALC_COMPANY",
    ok: calc.companyId === period.companyId,
    message: "Calculation belongs to period company",
  });

  checks.push({
    code: "CALC_STATUS",
    ok: ["READY_FOR_APPROVAL", "APPROVED", "PARTIALLY_APPROVED", "LOCKED"].includes(
      calc.status,
    ),
    message: `Calculation status: ${calc.status}`,
  });

  const openBlockers = await prisma.payrollValidation.count({
    where: {
      calculationId,
      severity: { in: ["BLOCKER", "ERROR"] },
      resolutionStatus: "OPEN",
    },
  });
  checks.push({
    code: "NO_OPEN_BLOCKERS",
    ok: openBlockers === 0,
    message:
      openBlockers === 0
        ? "No open ERROR/BLOCKER validations"
        : `${openBlockers} open ERROR/BLOCKER validation(s)`,
  });

  const tax = calc.taxConfigId
    ? await prisma.taxConfig.findUnique({ where: { id: calc.taxConfigId } })
    : await prisma.taxConfig.findFirst({
        where: { companyId: period.companyId, isActive: true },
      });
  checks.push({
    code: "TAX_VALID",
    ok: Boolean(tax && tax.isActive),
    message: tax
      ? `Tax config v${tax.version} (${tax.name})`
      : "No active tax configuration",
  });

  const bpjs = calc.bpjsConfigId
    ? await prisma.bpjsConfig.findUnique({ where: { id: calc.bpjsConfigId } })
    : await prisma.bpjsConfig.findFirst({
        where: { companyId: period.companyId, isActive: true },
      });
  checks.push({
    code: "BPJS_VALID",
    ok: Boolean(bpjs && bpjs.isActive),
    message: bpjs
      ? `BPJS config v${bpjs.version} (${bpjs.name})`
      : "No active BPJS configuration",
  });

  const activeFormulas = await prisma.payrollFormulaVersion.count({
    where: {
      isActive: true,
      formula: { companyId: period.companyId, status: "ACTIVE" },
    },
  });
  checks.push({
    code: "FORMULA_VALID",
    ok: activeFormulas > 0 || Boolean(calc.formulaVersionIds),
    message:
      activeFormulas > 0
        ? `${activeFormulas} active formula version(s)`
        : calc.formulaVersionIds
          ? "Using calculation formula snapshot"
          : "No active formulas",
  });

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

/**
 * Verify then project (idempotent before lock — re-run replaces lines).
 */
export async function verifyAndProject(
  scope: SessionScope,
  periodId: string,
  calculationId: string,
) {
  const verify = await verifyProjectionReadiness(
    scope,
    periodId,
    calculationId,
  );
  if (!verify.ok) {
    return { projected: false as const, verify };
  }
  const result = await projectCalculationToPayrollLines(
    scope,
    periodId,
    calculationId,
    { requireApprovedPeriod: true },
  );
  return { projected: true as const, verify, result };
}
