import { Badge } from "@/components/ui/badge";
import type {
  ApprovalStatus,
  DisbursementStatus,
  EmploymentStatus,
  PayrollStatus,
  WorkingCapitalStatus,
} from "@/types";

type AnyStatus =
  | PayrollStatus
  | ApprovalStatus
  | DisbursementStatus
  | WorkingCapitalStatus
  | EmploymentStatus
  | string;

const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "secondary" | "outline" | "accent" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  WAITING: { label: "Waiting", variant: "warning" },
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
  WAITING_CLIENT_TRANSFER: { label: "Waiting transfer", variant: "warning" },
  TRANSFER_PROOF_UPLOADED: { label: "Proof uploaded", variant: "info" },
  UNDER_VERIFICATION: { label: "Under verification", variant: "warning" },
  CLOSED: { label: "Closed", variant: "success" },
  PAYMENT_INSTRUCTION_GENERATED: {
    label: "Instruction ready",
    variant: "info",
  },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const config = map[status] ?? { label: String(status), variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
