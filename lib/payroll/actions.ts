import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { randomUUID } from "crypto";
import type { Role } from "@/types";

async function audit(
  scope: SessionScope,
  action: string,
  entity: string,
  entityId: string,
  detail?: string,
  companyId?: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: companyId ?? scope.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action,
      entity,
      entityId,
      detail,
      ip: "app",
    },
  });
}

export async function submitPayrollForApproval(
  scope: SessionScope,
  periodId: string,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { approvals: true },
  });
  if (!period) throw new Error("Payroll period not found");
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }
  if (!["DRAFT", "REJECTED"].includes(period.status)) {
    throw new Error("Only DRAFT or REJECTED periods can be submitted");
  }

  const matrix = await prisma.approvalMatrix.findMany({
    where: { companyId: period.companyId, isActive: true },
    orderBy: { level: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.deleteMany({ where: { payrollPeriodId: periodId } });
    if (matrix.length) {
      for (const m of matrix) {
        await tx.approvalStep.create({
          data: {
            id: randomUUID(),
            payrollPeriodId: periodId,
            level: m.level,
            approverName: m.role.replaceAll("_", " "),
            role: m.role,
            status: "PENDING",
          },
        });
      }
    } else {
      // Default 2-level matrix
      const defaults: { level: number; role: Role; name: string }[] = [
        { level: 1, role: "PAYROLL_ADMIN", name: "Payroll Admin" },
        { level: 2, role: "FINANCE", name: "Finance" },
        { level: 3, role: "DIRECTOR", name: "Director" },
      ];
      for (const d of defaults) {
        await tx.approvalStep.create({
          data: {
            id: randomUUID(),
            payrollPeriodId: periodId,
            level: d.level,
            approverName: d.name,
            role: d.role,
            status: "PENDING",
          },
        });
      }
    }
    await tx.payrollPeriod.update({
      where: { id: periodId },
      data: { status: "WAITING" },
    });
  });

  await audit(scope, "SUBMIT_FOR_APPROVAL", "PayrollPeriod", periodId, undefined, period.companyId);
}

export async function actOnApprovalStep(
  scope: SessionScope,
  stepId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: { payrollPeriod: true },
  });
  if (!step) throw new Error("Approval step not found");
  if (step.status !== "PENDING") throw new Error("Step already actioned");

  const period = step.payrollPeriod;
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }

  // Role match or SUPER_ADMIN/DIRECTOR override
  const canAct =
    scope.role === "SUPER_ADMIN" ||
    scope.role === "DIRECTOR" ||
    scope.role === step.role ||
    (scope.role === "PAYROLL_ADMIN" && step.level === 1);
  if (!canAct) throw new Error("Not authorized for this approval level");

  const user = await prisma.user.findUnique({ where: { id: scope.userId } });

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({
      where: { id: stepId },
      data: {
        status: decision,
        comment: comment ?? null,
        actedAt: new Date(),
        userId: scope.userId,
        approverName: user?.name ?? step.approverName,
      },
    });

    if (decision === "REJECTED") {
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: "REJECTED" },
      });
    } else {
      const pending = await tx.approvalStep.count({
        where: { payrollPeriodId: period.id, status: "PENDING" },
      });
      if (pending === 0) {
        await tx.payrollPeriod.update({
          where: { id: period.id },
          data: { status: "APPROVED" },
        });
      }
    }
  });

  await audit(
    scope,
    decision === "APPROVED" ? "APPROVE_PAYROLL" : "REJECT_PAYROLL",
    "ApprovalStep",
    stepId,
    comment,
    period.companyId,
  );
}

/**
 * Compatibility adapter (ADR-001): run engine calculation for the period.
 * Does not project to lines until explicit project after approval.
 * Requires TaxConfig + BpjsConfig (no silent defaults).
 */
export async function recalculatePayrollPeriod(
  scope: SessionScope,
  periodId: string,
) {
  const { runPeriodPayrollCalculation } = await import("@/lib/payroll/period-run");
  const result = await runPeriodPayrollCalculation(scope, periodId, {
    projectImmediately: false,
  });
  await audit(
    scope,
    "RECALCULATE_PAYROLL",
    "PayrollPeriod",
    periodId,
    `calc=${result.calculationId} status=${result.status}`,
    undefined,
  );
  return result;
}

/**
 * I2-A: Create DRAFT payment instruction (no auto-approve).
 * Prefer lib/payout/instruction-service.createInstruction.
 */
export async function generatePaymentInstruction(
  scope: SessionScope,
  periodId: string,
) {
  const { createInstruction } = await import("@/lib/payout/instruction-service");
  const result = await createInstruction(scope, { periodId });
  return result.instruction.id;
}

export async function buildInstructionCsv(instructionId: string): Promise<string> {
  const pi = await prisma.paymentInstruction.findUnique({
    where: { id: instructionId },
    include: { items: true, payrollPeriod: true, company: true },
  });
  if (!pi) throw new Error("Instruction not found");

  const header = [
    "instruction_number",
    "period",
    "company",
    "employee_name",
    "bank",
    "account_masked",
    "amount",
    "currency",
    "execution_model",
  ].join(",");

  const rows = pi.items.map((it) =>
    [
      pi.instructionNumber,
      pi.payrollPeriod.name,
      pi.company.name,
      `"${it.recipientName}"`,
      it.bankCode ?? "",
      it.maskedAccountNumber,
      Number(it.amount).toFixed(2),
      pi.currency,
      pi.executionModel,
    ].join(","),
  );

  return [header, ...rows].join("\n");
}
