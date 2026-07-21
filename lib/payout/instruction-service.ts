/**
 * I2-A Payment Instruction control plane (maker-checker).
 * Amounts snapshotted from locked PayrollLine only (ADR-001 / ADR-004).
 */

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";
import {
  assertTransition,
  deriveControlPhase,
  isCheckerRole,
  isMakerRole,
  type ControlAction,
} from "@/lib/payout/state-machine";
import {
  assertPayoutTotals,
  contentChecksum,
  num,
} from "@/lib/payout/invariants";

async function auditPayout(
  scope: SessionScope,
  action: string,
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
      entity: "PaymentInstruction",
      entityId,
      detail: detail ?? null,
      ip: "app",
    },
  });
}

function assertMaker(scope: SessionScope) {
  if (!isMakerRole(scope.role) && scope.role !== "SUPER_ADMIN") {
    throw new Error("Not authorized as payout maker");
  }
}

function assertChecker(scope: SessionScope) {
  if (!isCheckerRole(scope.role) && scope.role !== "SUPER_ADMIN") {
    throw new Error("Not authorized as payout checker");
  }
}

/** Active = not cancelled and not fully executed terminal for control plane. */
const ACTIVE_EXEC = new Set([
  "DRAFT",
  "READY",
  "NOT_STARTED",
  "SUBMITTED",
  "PROCESSING",
  "PARTIALLY_FAILED",
]);

export async function findActiveInstruction(periodId: string) {
  return prisma.paymentInstruction.findFirst({
    where: {
      payrollPeriodId: periodId,
      executionStatus: { in: [...ACTIVE_EXEC] as never[] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listInstructions(
  scope: SessionScope,
  opts?: {
    approvalStatus?: string;
    executionStatus?: string;
    phase?: string;
    take?: number;
  },
) {
  const companyFilter =
    scope.role === "SUPER_ADMIN"
      ? {}
      : scope.companyId
        ? { companyId: scope.companyId }
        : { companyId: "00000000-0000-0000-0000-000000000000" };

  const rows = await prisma.paymentInstruction.findMany({
    where: {
      ...companyFilter,
      ...(opts?.approvalStatus
        ? { approvalStatus: opts.approvalStatus as never }
        : {}),
      ...(opts?.executionStatus
        ? { executionStatus: opts.executionStatus as never }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.take ?? 50, 100),
    include: {
      company: { select: { id: true, name: true } },
      payrollPeriod: {
        select: { id: true, name: true, status: true, totalNet: true },
      },
      maker: { select: { id: true, name: true, email: true } },
      checker: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  return rows.map((r) => ({
    ...r,
    controlPhase: deriveControlPhase(r),
    totalAmount: num(r.totalAmount),
  })).filter((r) => {
    if (!opts?.phase) return true;
    return r.controlPhase === opts.phase;
  });
}

export async function getInstruction(scope: SessionScope, id: string) {
  const pi = await prisma.paymentInstruction.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      payrollPeriod: {
        select: {
          id: true,
          name: true,
          status: true,
          totalNet: true,
          projectedCalculationId: true,
          lockedAt: true,
        },
      },
      maker: { select: { id: true, name: true, email: true } },
      checker: { select: { id: true, name: true, email: true } },
      generatedBy: { select: { id: true, name: true } },
      items: { orderBy: { recipientName: "asc" } },
      sourceBankAccount: true,
    },
  });
  if (!pi) throw new Error("Payment instruction not found");
  if (!assertCompanyAccess(scope, pi.companyId)) {
    throw new Error("Cross-company access denied");
  }

  const lineSum = pi.payrollPeriod
    ? num(
        (
          await prisma.payrollLine.aggregate({
            where: { payrollPeriodId: pi.payrollPeriodId },
            _sum: { netPay: true },
          })
        )._sum.netPay,
      )
    : 0;
  const itemSum = pi.items.reduce((s, i) => s + num(i.amount), 0);
  const periodNet = num(pi.payrollPeriod?.totalNet);
  const phase = deriveControlPhase(pi);

  return {
    ...pi,
    controlPhase: phase,
    totalAmount: num(pi.totalAmount),
    invariants: {
      periodNet,
      lineSum,
      itemSum,
      ok:
        Math.abs(periodNet - lineSum) <= 0.02 &&
        Math.abs(itemSum - lineSum) <= 0.02,
    },
    nextActions: nextActionsFor(phase, scope, pi.makerUserId ?? pi.generatedById),
  };
}

function nextActionsFor(
  phase: ReturnType<typeof deriveControlPhase>,
  scope: SessionScope,
  makerId: string | null | undefined,
): string[] {
  const actions: string[] = [];
  const isMaker = isMakerRole(scope.role);
  const isChecker = isCheckerRole(scope.role);
  if (phase === "DRAFT" && isMaker) actions.push("SUBMIT", "CANCEL");
  if (phase === "SUBMITTED" && isChecker) {
    actions.push("APPROVE", "REJECT");
    if (isMaker && scope.userId === makerId) {
      // still show cancel for maker while submitted? design allows cancel pre-execution
      actions.push("CANCEL");
    } else if (isMaker) actions.push("CANCEL");
  }
  if (phase === "SUBMITTED" && isMaker && !actions.includes("CANCEL")) {
    actions.push("CANCEL");
  }
  if (phase === "REJECTED" && isMaker) actions.push("RESUBMIT", "CANCEL");
  if (phase === "APPROVED") actions.push("READY_FOR_BANK_FILE");
  return [...new Set(actions)];
}

/**
 * Create DRAFT PI from locked (or approved+projected) period lines.
 * approvalStatus=PENDING, executionStatus=DRAFT, no auto-approve.
 */
export async function createInstruction(
  scope: SessionScope,
  input: { periodId: string; idempotencyKey?: string | null },
) {
  assertMaker(scope);

  if (input.idempotencyKey) {
    const existing = await prisma.paymentInstruction.findFirst({
      where: {
        companyId: scope.companyId ?? undefined,
        idempotencyKey: input.idempotencyKey,
      },
    });
    // Prefer lookup by key globally for super admin
    const byKey = await prisma.paymentInstruction.findFirst({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (byKey) {
      if (!assertCompanyAccess(scope, byKey.companyId)) {
        throw new Error("Cross-company access denied");
      }
      return { instruction: byKey, idempotent: true as const };
    }
    void existing;
  }

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: input.periodId },
    include: { lines: true, company: true },
  });
  if (!period) throw new Error("Payroll period not found");
  if (!assertCompanyAccess(scope, period.companyId)) {
    throw new Error("Cross-company access denied");
  }

  if (!["LOCKED", "APPROVED"].includes(period.status)) {
    throw new Error(
      "Period must be LOCKED (preferred) or APPROVED before creating payment instruction",
    );
  }
  if (!period.projectedCalculationId) {
    throw new Error(
      "Period has no projected calculation — project approved calculation to PayrollLine first",
    );
  }
  if (!period.lines.length) {
    throw new Error("Period has no payroll lines");
  }

  const active = await findActiveInstruction(period.id);
  if (active) {
    throw new Error(
      `Active payment instruction already exists (${active.instructionNumber}) — cancel it or complete the control flow first`,
    );
  }

  assertPayoutTotals({
    periodTotalNet: num(period.totalNet),
    lines: period.lines,
  });

  const checksum = contentChecksum(period.lines);
  const bank = await prisma.bankAccount.findFirst({
    where: { companyId: period.companyId, purpose: "CLIENT_PAYROLL_SOURCE" },
  });

  const count = await prisma.paymentInstruction.count({
    where: { payrollPeriodId: period.id },
  });
  const instructionNumber = `PI-${period.name.replace(/\s+/g, "").toUpperCase()}-${String(count + 1).padStart(3, "0")}`;
  const id = randomUUID();

  const emps = await prisma.employee.findMany({
    where: { id: { in: period.lines.map((l) => l.employeeId) } },
  });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  const executionModel =
    period.fundingModel === "WORKING_CAPITAL"
      ? "WORKING_CAPITAL"
      : "CLIENT_SELF_TRANSFER";

  await prisma.paymentInstruction.create({
    data: {
      id,
      companyId: period.companyId,
      payrollPeriodId: period.id,
      instructionNumber,
      fundingModel: period.fundingModel,
      executionModel,
      executionType:
        executionModel === "WORKING_CAPITAL"
          ? "PROQPAY_MANAGED_TRANSFER"
          : "CLIENT_BANK_TRANSFER",
      integrationStatus: "SIMULATED",
      sourceBankAccountId: bank?.id ?? period.sourceBankAccountId,
      totalRecords: period.lines.length,
      totalAmount: period.totalNet,
      currency: "IDR",
      // I2-A: NOT auto-approved
      approvalStatus: "PENDING",
      executionStatus: "DRAFT",
      generatedById: scope.userId,
      makerUserId: scope.userId,
      generatedAt: new Date(),
      contentChecksum: checksum,
      idempotencyKey: input.idempotencyKey ?? null,
      version: 1,
    },
  });

  const items = period.lines.map((line) => {
    const emp = empMap.get(line.employeeId);
    return {
      id: randomUUID(),
      paymentInstructionId: id,
      payrollLineId: line.id,
      employeeId: line.employeeId,
      recipientName: line.employeeName,
      bankCode: emp?.bankName ?? null,
      maskedAccountNumber: emp?.bankAccount
        ? `••••${emp.bankAccount.slice(-4)}`
        : "••••",
      amount: line.netPay,
      status: "READY" as const,
    };
  });

  for (let i = 0; i < items.length; i += 50) {
    await prisma.paymentInstructionItem.createMany({
      data: items.slice(i, i + 50),
    });
  }

  // Keep period LOCKED; only set paymentInstructionStatus lightly
  await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: {
      paymentInstructionStatus: "DRAFT",
    },
  });

  await auditPayout(
    scope,
    "PI_CREATED",
    id,
    `DRAFT ${instructionNumber} checksum=${checksum.slice(0, 12)}`,
    period.companyId,
  );

  const instruction = await prisma.paymentInstruction.findUnique({
    where: { id },
  });
  return { instruction: instruction!, idempotent: false as const };
}

export async function submitInstruction(scope: SessionScope, id: string) {
  assertMaker(scope);
  const pi = await loadPiOrThrow(scope, id);
  const phase = deriveControlPhase(pi);
  assertTransition(phase, "SUBMIT");

  // Re-verify totals on submit
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: pi.payrollPeriodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Period not found");
  const items = await prisma.paymentInstructionItem.findMany({
    where: { paymentInstructionId: id },
  });
  assertPayoutTotals({
    periodTotalNet: num(period.totalNet),
    lines: period.lines,
    items,
  });

  const updated = await prisma.paymentInstruction.update({
    where: { id },
    data: {
      submittedAt: new Date(),
      approvalStatus: "PENDING",
      executionStatus: "DRAFT",
      rejectionReason: null,
      version: { increment: 1 },
    },
  });

  await auditPayout(
    scope,
    "PI_SUBMITTED",
    id,
    "Submitted for checker approval",
    pi.companyId,
  );
  return updated;
}

export async function approveInstruction(
  scope: SessionScope,
  id: string,
  input?: { comment?: string | null },
) {
  assertChecker(scope);
  const pi = await loadPiOrThrow(scope, id);
  const phase = deriveControlPhase(pi);
  assertTransition(phase, "APPROVE");

  const makerId = pi.makerUserId ?? pi.generatedById;
  if (makerId && makerId === scope.userId) {
    if (scope.role !== "SUPER_ADMIN") {
      throw new Error(
        "Maker cannot approve own payment batch (segregation of duties)",
      );
    }
    if (!input?.comment?.trim()) {
      throw new Error(
        "SUPER_ADMIN self-approval requires a mandatory comment",
      );
    }
  }

  const items = await prisma.paymentInstructionItem.findMany({
    where: { paymentInstructionId: id },
  });
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: pi.payrollPeriodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Period not found");
  assertPayoutTotals({
    periodTotalNet: num(period.totalNet),
    lines: period.lines,
    items,
  });

  const updated = await prisma.paymentInstruction.update({
    where: { id },
    data: {
      approvalStatus: "APPROVED",
      executionStatus: "READY",
      checkerUserId: scope.userId,
      checkedAt: new Date(),
      approvalComment: input?.comment ?? null,
      rejectionReason: null,
      version: { increment: 1 },
    },
  });

  await prisma.payrollPeriod.update({
    where: { id: pi.payrollPeriodId },
    data: { paymentInstructionStatus: "READY" },
  });

  await auditPayout(
    scope,
    "PI_APPROVED",
    id,
    input?.comment ?? "Approved — READY for bank file generation",
    pi.companyId,
  );
  return updated;
}

export async function rejectInstruction(
  scope: SessionScope,
  id: string,
  input: { reason: string },
) {
  assertChecker(scope);
  if (!input.reason?.trim()) {
    throw new Error("rejection reason required");
  }
  const pi = await loadPiOrThrow(scope, id);
  const phase = deriveControlPhase(pi);
  assertTransition(phase, "REJECT");

  const makerId = pi.makerUserId ?? pi.generatedById;
  if (makerId && makerId === scope.userId && scope.role !== "SUPER_ADMIN") {
    throw new Error("Maker cannot reject own payment batch");
  }

  const updated = await prisma.paymentInstruction.update({
    where: { id },
    data: {
      approvalStatus: "REJECTED",
      executionStatus: "DRAFT",
      checkerUserId: scope.userId,
      checkedAt: new Date(),
      rejectionReason: input.reason.trim(),
      submittedAt: null,
      version: { increment: 1 },
    },
  });

  await auditPayout(
    scope,
    "PI_REJECTED",
    id,
    input.reason.trim(),
    pi.companyId,
  );
  return updated;
}

/** After reject: clear rejection markers so maker can submit again (same PI). */
export async function resubmitInstruction(scope: SessionScope, id: string) {
  assertMaker(scope);
  const pi = await loadPiOrThrow(scope, id);
  const phase = deriveControlPhase(pi);
  assertTransition(phase, "RESUBMIT");

  // Re-check invariants before allowing resubmit path
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: pi.payrollPeriodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Period not found");
  const items = await prisma.paymentInstructionItem.findMany({
    where: { paymentInstructionId: id },
  });
  assertPayoutTotals({
    periodTotalNet: num(period.totalNet),
    lines: period.lines,
    items,
  });

  const updated = await prisma.paymentInstruction.update({
    where: { id },
    data: {
      approvalStatus: "PENDING",
      executionStatus: "DRAFT",
      submittedAt: new Date(),
      rejectionReason: null,
      checkerUserId: null,
      checkedAt: null,
      approvalComment: null,
      version: { increment: 1 },
    },
  });

  await auditPayout(
    scope,
    "PI_RESUBMITTED",
    id,
    "Resubmitted after rejection",
    pi.companyId,
  );
  return updated;
}

export async function cancelInstruction(
  scope: SessionScope,
  id: string,
  input?: { reason?: string | null },
) {
  assertMaker(scope);
  const pi = await loadPiOrThrow(scope, id);
  const phase = deriveControlPhase(pi);
  assertTransition(phase, "CANCEL" as ControlAction);

  if (phase === "APPROVED" || phase === "IN_EXECUTION") {
    throw new Error("Cannot cancel after approval/execution has started");
  }

  const updated = await prisma.paymentInstruction.update({
    where: { id },
    data: {
      executionStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: input?.reason ?? null,
      version: { increment: 1 },
    },
  });

  await auditPayout(
    scope,
    "PI_CANCELLED",
    id,
    input?.reason ?? "Cancelled",
    pi.companyId,
  );
  return updated;
}

async function loadPiOrThrow(scope: SessionScope, id: string) {
  const pi = await prisma.paymentInstruction.findUnique({ where: { id } });
  if (!pi) throw new Error("Payment instruction not found");
  if (!assertCompanyAccess(scope, pi.companyId)) {
    throw new Error("Cross-company access denied");
  }
  return pi;
}
