/**
 * I2-A Payment Instruction control-plane state machine (pure).
 *
 * Dual-axis encoding (no new enum values required for MVP):
 * - DRAFT:      approval PENDING, execution DRAFT, submittedAt null
 * - SUBMITTED:  approval PENDING, execution DRAFT, submittedAt set
 * - APPROVED:   approval APPROVED, execution READY
 * - REJECTED:   approval REJECTED, execution DRAFT
 * - CANCELLED:  execution CANCELLED
 */

import type { ApprovalStatus, PaymentInstructionStatus } from "@prisma/client";

export type ControlPhase =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "IN_EXECUTION"
  | "UNKNOWN";

export type PiSnapshot = {
  approvalStatus: ApprovalStatus;
  executionStatus: PaymentInstructionStatus;
  submittedAt: Date | string | null;
  makerUserId?: string | null;
  checkerUserId?: string | null;
};

export function deriveControlPhase(pi: PiSnapshot): ControlPhase {
  if (pi.executionStatus === "CANCELLED") return "CANCELLED";
  if (
    ["SUBMITTED", "PROCESSING", "EXECUTED", "PARTIALLY_FAILED", "FAILED"].includes(
      pi.executionStatus,
    )
  ) {
    return "IN_EXECUTION";
  }
  if (pi.approvalStatus === "APPROVED" && pi.executionStatus === "READY") {
    return "APPROVED";
  }
  if (pi.approvalStatus === "REJECTED") return "REJECTED";
  if (pi.approvalStatus === "PENDING" && pi.submittedAt) return "SUBMITTED";
  if (pi.approvalStatus === "PENDING" && !pi.submittedAt) return "DRAFT";
  return "UNKNOWN";
}

export type ControlAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "RESUBMIT"
  | "CANCEL";

const ALLOWED: Record<ControlPhase, ControlAction[]> = {
  DRAFT: ["SUBMIT", "CANCEL"],
  SUBMITTED: ["APPROVE", "REJECT", "CANCEL"],
  APPROVED: [], // immutable for I2-A (bank file in I2-B)
  REJECTED: ["RESUBMIT", "CANCEL"],
  CANCELLED: [],
  IN_EXECUTION: [],
  UNKNOWN: [],
};

export function canTransition(
  phase: ControlPhase,
  action: ControlAction,
): boolean {
  return ALLOWED[phase]?.includes(action) ?? false;
}

export function assertTransition(
  phase: ControlPhase,
  action: ControlAction,
): void {
  if (!canTransition(phase, action)) {
    throw new Error(
      `Invalid payout control transition: cannot ${action} from ${phase}`,
    );
  }
}

/** Roles that may create/submit/resubmit/cancel (maker path). */
export const PAYOUT_MAKER_ROLES = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "PAYROLL_OPERATOR",
  "DIRECTOR",
] as const;

/** Roles that may approve/reject (checker path). */
export const PAYOUT_CHECKER_ROLES = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "FINANCE",
  "FINANCE_MANAGER",
  "DIRECTOR",
  "APPROVER",
] as const;

export function isMakerRole(role: string): boolean {
  return (PAYOUT_MAKER_ROLES as readonly string[]).includes(role);
}

export function isCheckerRole(role: string): boolean {
  return (PAYOUT_CHECKER_ROLES as readonly string[]).includes(role);
}

export const TOLERANCE = 0.02;

export function amountsMatch(
  a: number,
  b: number,
  tol = TOLERANCE,
): boolean {
  return Math.abs(a - b) <= tol;
}
