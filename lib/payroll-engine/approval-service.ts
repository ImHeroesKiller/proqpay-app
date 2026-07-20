/**
 * Configurable payroll engine approval workflow.
 */

import { prisma } from "@/lib/db";
import type { EngineApprovalAction } from "@prisma/client";

export async function actOnApprovalStep(input: {
  stepId: string;
  action: EngineApprovalAction;
  comment?: string | null;
  actorId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const step = await tx.payrollApprovalStep.findUnique({
      where: { id: input.stepId },
      include: { approval: { include: { steps: { orderBy: { level: "asc" } } } } },
    });
    if (!step) throw new Error("Approval step not found");
    if (step.status !== "PENDING") throw new Error("Step already acted");

    // Prior levels must be approved
    const prior = step.approval.steps.filter((s) => s.level < step.level);
    if (prior.some((s) => s.status !== "APPROVED")) {
      throw new Error("Previous approval levels incomplete");
    }

    await tx.payrollApprovalStep.update({
      where: { id: step.id },
      data: {
        status:
          input.action === "APPROVE"
            ? "APPROVED"
            : input.action === "REJECT"
              ? "REJECTED"
              : input.action === "REQUEST_REVISION"
                ? "REVISION"
                : "COMMENTED",
        action: input.action,
        comment: input.comment ?? null,
        actedAt: new Date(),
        actedById: input.actorId ?? null,
      },
    });

    if (input.action === "REJECT" || input.action === "REQUEST_REVISION") {
      await tx.payrollApproval.update({
        where: { id: step.approvalId },
        data: { status: input.action === "REJECT" ? "REJECTED" : "REVISION" },
      });
      await tx.payrollCalculation.update({
        where: { id: step.approval.calculationId },
        data: {
          status:
            input.action === "REJECT" ? "CANCELLED" : "DRAFT",
        },
      });
      return { approvalStatus: input.action };
    }

    if (input.action === "APPROVE") {
      const remaining = step.approval.steps.filter(
        (s) => s.level > step.level && s.status === "PENDING",
      );
      if (remaining.length === 0) {
        await tx.payrollApproval.update({
          where: { id: step.approvalId },
          data: { status: "APPROVED" },
        });
        await tx.payrollCalculation.update({
          where: { id: step.approval.calculationId },
          data: { status: "APPROVED" },
        });
        return { approvalStatus: "APPROVED" };
      }
      await tx.payrollApproval.update({
        where: { id: step.approvalId },
        data: { status: "PARTIALLY_APPROVED" },
      });
      await tx.payrollCalculation.update({
        where: { id: step.approval.calculationId },
        data: { status: "PARTIALLY_APPROVED" },
      });
      return { approvalStatus: "PARTIALLY_APPROVED" };
    }

    return { approvalStatus: "COMMENT" };
  });
}

export async function getApprovalTimeline(calculationId: string) {
  return prisma.payrollApproval.findFirst({
    where: { calculationId },
    include: { steps: { orderBy: { level: "asc" } } },
  });
}
