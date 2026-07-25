import type { PayrollStatus } from "@/types";

export type PipelineStageStatus =
  | "done"
  | "current"
  | "upcoming"
  | "warning"
  | "critical";

export type PipelineIconKey =
  | "attendance"
  | "validation"
  | "calculation"
  | "approval"
  | "instruction"
  | "confirmation"
  | "completed";

export type PipelineStage = {
  key: string;
  label: string;
  status: PipelineStageStatus;
  owner?: string;
  completedAt?: string;
  tooltip?: string;
  /** Serializable icon id — resolved to a Lucide component on the client */
  iconKey: PipelineIconKey;
};

const STAGE_DEFS: {
  key: PipelineIconKey;
  label: string;
  statuses: PayrollStatus[];
}[] = [
  {
    key: "attendance",
    label: "Attendance",
    statuses: ["DRAFT"],
  },
  {
    key: "validation",
    label: "Validation",
    statuses: ["DRAFT", "WAITING"],
  },
  {
    key: "calculation",
    label: "Payroll Calculation",
    statuses: ["WAITING"],
  },
  {
    key: "approval",
    label: "Approval",
    statuses: ["WAITING", "APPROVED"],
  },
  {
    key: "instruction",
    label: "Payment Instruction",
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
      iconKey: s.key,
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
      iconKey: s.key,
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
