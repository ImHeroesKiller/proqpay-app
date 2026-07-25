import {
  CalendarCheck,
  ShieldCheck,
  Calculator,
  GitBranch,
  FileText,
  ClipboardCheck,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import type { PayrollStatus } from "@/types";

export type PipelineStageStatus =
  | "done"
  | "current"
  | "upcoming"
  | "warning"
  | "critical";

export type PipelineStage = {
  key: string;
  label: string;
  status: PipelineStageStatus;
  owner?: string;
  completedAt?: string;
  tooltip?: string;
  icon: LucideIcon;
};

const STAGE_DEFS: {
  key: string;
  label: string;
  icon: LucideIcon;
  statuses: PayrollStatus[];
}[] = [
  {
    key: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    statuses: ["DRAFT"],
  },
  {
    key: "validation",
    label: "Validation",
    icon: ShieldCheck,
    statuses: ["DRAFT", "WAITING"],
  },
  {
    key: "calculation",
    label: "Payroll Calculation",
    icon: Calculator,
    statuses: ["WAITING"],
  },
  {
    key: "approval",
    label: "Approval",
    icon: GitBranch,
    statuses: ["WAITING", "APPROVED"],
  },
  {
    key: "instruction",
    label: "Payment Instruction",
    icon: FileText,
    statuses: [
      "APPROVED",
      "LOCKED",
      "PAYMENT_INSTRUCTION_GENERATED",
      "WAITING_CLIENT_TRANSFER",
    ],
  },
  {
    key: "confirmation",
    label: "Payment Confirmation",
    icon: ClipboardCheck,
    statuses: [
      "WAITING_CLIENT_TRANSFER",
      "TRANSFER_PROOF_UPLOADED",
      "UNDER_VERIFICATION",
      "VERIFIED",
    ],
  },
  {
    key: "completed",
    label: "Completed",
    icon: PartyPopper,
    statuses: ["CLOSED", "DISBURSED", "VERIFIED"],
  },
];

function stageIndexForStatus(status: PayrollStatus): number {
  const order: PayrollStatus[] = [
    "DRAFT",
    "WAITING",
    "APPROVED",
    "LOCKED",
    "PAYMENT_INSTRUCTION_GENERATED",
    "WAITING_CLIENT_TRANSFER",
    "TRANSFER_PROOF_UPLOADED",
    "UNDER_VERIFICATION",
    "VERIFIED",
    "DISBURSED",
    "CLOSED",
  ];
  const idx = order.indexOf(status);
  if (status === "REJECTED") return 3;
  if (idx < 0) return 0;
  if (idx <= 0) return 0;
  if (idx === 1) return 2;
  if (idx === 2) return 3;
  if (idx <= 4) return 4;
  if (idx <= 8) return 5;
  return 6;
}

/** Server-safe: builds pipeline stage model for the active payroll status. */
export function buildPipeline(
  status?: PayrollStatus | null,
  opts?: { pendingApprovals?: number; failedPayments?: number },
): PipelineStage[] {
  if (!status) {
    return STAGE_DEFS.map((s, i) => ({
      key: s.key,
      label: s.label,
      icon: s.icon,
      status: i === 0 ? "current" : "upcoming",
      tooltip: "No active payroll period",
    }));
  }

  const current = stageIndexForStatus(status);
  return STAGE_DEFS.map((s, i) => {
    let st: PipelineStageStatus =
      i < current ? "done" : i === current ? "current" : "upcoming";
    if (status === "REJECTED" && i === 3) st = "critical";
    if (opts?.pendingApprovals && i === 3 && st === "current") st = "warning";
    if (opts?.failedPayments && i === 5 && (st === "current" || st === "done"))
      st = "critical";
    return {
      key: s.key,
      label: s.label,
      icon: s.icon,
      status: st,
      owner:
        i === 0
          ? "HR Ops"
          : i === 3
            ? "Approver"
            : i >= 4
              ? "Finance"
              : "Payroll",
      completedAt: st === "done" ? "Completed" : undefined,
      tooltip:
        st === "current"
          ? `${s.label} in progress`
          : st === "done"
            ? `${s.label} completed`
            : `${s.label} pending`,
    };
  });
}
