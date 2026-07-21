/**
 * WorkingCapitalService — approvals & settlements on existing WC requests.
 */

import { prisma } from "@/lib/db";
import {
  applySettlement,
  remainingExposure,
  settlementStatusFromAmounts,
} from "@/lib/financial/working-capital-rules";
import {
  recordFinancialAudit,
  type FinancialActor,
} from "@/lib/financial/audit";
import type { SettlementStatus, WcApprovalDecision, WcSettlementKind } from "@prisma/client";

function num(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number(v.toString());
}

export async function recordWcApproval(input: {
  workingCapitalRequestId: string;
  level?: number;
  decision: WcApprovalDecision;
  comment?: string | null;
  actor: FinancialActor;
}) {
  const req = await prisma.workingCapitalRequest.findUnique({
    where: { id: input.workingCapitalRequestId },
  });
  if (!req) throw new Error("Working capital request not found");

  const approval = await prisma.$transaction(async (tx) => {
    const row = await tx.workingCapitalApproval.create({
      data: {
        workingCapitalRequestId: input.workingCapitalRequestId,
        level: input.level ?? 1,
        decision: input.decision,
        decidedById: input.actor.id ?? null,
        comment: input.comment ?? null,
      },
    });
    if (input.decision === "APPROVED") {
      await tx.workingCapitalRequest.update({
        where: { id: req.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: input.actor.id ?? null,
        },
      });
    } else if (input.decision === "REJECTED") {
      await tx.workingCapitalRequest.update({
        where: { id: req.id },
        data: { status: "REJECTED" },
      });
    }
    return row;
  });

  await recordFinancialAudit({
    actor: input.actor,
    action: `WC_APPROVAL_${input.decision}`,
    entityType: "WorkingCapitalRequest",
    entityId: req.id,
    companyId: req.companyId,
  });

  return approval;
}

export async function recordWcSettlement(input: {
  workingCapitalRequestId: string;
  amount: number;
  settlementDate: Date;
  kind?: WcSettlementKind;
  reference?: string | null;
  notes?: string | null;
  actor: FinancialActor;
}) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.workingCapitalRequest.findUnique({
      where: { id: input.workingCapitalRequestId },
    });
    if (!req) throw new Error("Working capital request not found");

    const approved = num(req.approvedAmount);
    const repaid = num(req.repaidAmount);
    const { nextRepaid, remaining } = applySettlement({
      approvedAmount: approved,
      repaidAmount: repaid,
      settlementAmount: input.amount,
    });

    const settlement = await tx.workingCapitalSettlement.create({
      data: {
        workingCapitalRequestId: req.id,
        kind: input.kind ?? "REPAYMENT",
        amount: input.amount,
        settlementDate: input.settlementDate,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedById: input.actor.id ?? null,
      },
    });

    const settlementStatus = settlementStatusFromAmounts(
      approved,
      nextRepaid,
    ) as SettlementStatus;

    await tx.workingCapitalRequest.update({
      where: { id: req.id },
      data: {
        repaidAmount: nextRepaid,
        settlementStatus,
        repaidAt: remaining <= 0.0001 ? new Date() : req.repaidAt,
        status: remaining <= 0.0001 ? "REPAID" : req.status,
      },
    });

    await recordFinancialAudit({
      actor: input.actor,
      action: "WC_SETTLEMENT",
      entityType: "WorkingCapitalRequest",
      entityId: req.id,
      companyId: req.companyId,
      after: { repaid: nextRepaid, remaining },
    });

    return { settlement, remaining: remainingExposure({ approvedAmount: approved, repaidAmount: nextRepaid }) };
  });
}
