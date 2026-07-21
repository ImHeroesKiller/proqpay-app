/**
 * Single source of truth for operational status labels and badge variants.
 * UI components must import from here — do not scatter status colors.
 */

export type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type StatusConfig = {
  label: string;
  variant: StatusVariant;
  description?: string;
};

/** Canonical payroll lifecycle (display order). */
export const PAYROLL_LIFECYCLE_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "VALIDATION", label: "Data validation" },
  { key: "READY_FOR_APPROVAL", label: "Ready for approval" },
  { key: "APPROVAL", label: "Approval" },
  { key: "PAYMENT_INSTRUCTION", label: "Payment instruction" },
  { key: "CLIENT_TRANSFER", label: "Client transfer" },
  { key: "PROOF_UPLOADED", label: "Proof uploaded" },
  { key: "VERIFICATION", label: "Verification" },
  { key: "COMPLETED", label: "Completed / closed" },
] as const;

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { label: "Draft", variant: "secondary", description: "Period being prepared" },
  WAITING: { label: "Waiting approval", variant: "warning", description: "Pending multilevel approval" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
  LOCKED: { label: "Locked", variant: "info" },
  DISBURSED: { label: "Disbursed", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
  REQUESTED: { label: "Requested", variant: "warning" },
  OUTSTANDING: { label: "Outstanding", variant: "accent" },
  REPAID: { label: "Repaid", variant: "success" },
  ACTIVE: { label: "Active", variant: "success" },
  PROBATION: { label: "Probation", variant: "warning" },
  RESIGNED: { label: "Resigned", variant: "secondary" },
  TERMINATED: { label: "Terminated", variant: "danger" },
  READY: { label: "Ready", variant: "info" },
  SUBMITTED: { label: "Submitted", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "warning" },
  EXECUTED: { label: "Executed", variant: "success" },
  FUNDED: { label: "Funded", variant: "success" },
  NOT_STARTED: { label: "Not started", variant: "secondary" },
  NOT_REQUIRED: { label: "Not required", variant: "secondary" },
  UNDER_REVIEW: { label: "Under review", variant: "warning" },
  SETTLEMENT_DUE: { label: "Settlement due", variant: "accent" },
  PARTIALLY_FAILED: { label: "Partial fail", variant: "danger" },
  SELF_FUNDED: { label: "Client-funded", variant: "info" },
  WORKING_CAPITAL: { label: "Working capital", variant: "accent" },
  UPLOADED: { label: "Uploaded", variant: "info" },
  VERIFIED: { label: "Verified", variant: "success" },
  NEED_REVISION: { label: "Need revision", variant: "warning" },
  WAITING_CLIENT_TRANSFER: {
    label: "Waiting transfer",
    variant: "warning",
    description: "Client must transfer from client bank to employees",
  },
  TRANSFER_PROOF_UPLOADED: { label: "Proof uploaded", variant: "info" },
  UNDER_VERIFICATION: { label: "Under verification", variant: "warning" },
  CLOSED: { label: "Closed", variant: "success" },
  PAYMENT_INSTRUCTION_GENERATED: {
    label: "Instruction ready",
    variant: "info",
  },
  OVERDUE: { label: "Overdue", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  OPEN: { label: "Open", variant: "info" },
  WON: { label: "Won", variant: "success" },
  LOST: { label: "Lost", variant: "secondary" },
};

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      label: status.replaceAll("_", " "),
      variant: "outline" as const,
    }
  );
}
