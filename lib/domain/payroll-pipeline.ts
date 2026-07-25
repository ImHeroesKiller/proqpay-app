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
  | "completed"
  | "payment";

export type PipelineStage = {
  key: string;
  label: string;
  status: PipelineStageStatus;
  owner?: string;
  completedAt?: string;
  tooltip?: string;
  /** Serializable icon id — resolved to a Lucide component on the client */
  iconKey: PipelineIconKey;
  /** Display percentage 0–100 */
  percent?: number;
  /** Human-readable count e.g. "3.276 / 3.420" */
  countLabel?: string;
};

/** Six-stage executive journey (presentation) */
const STAGE_DEFS: {
  key: string;
  label: string;
  iconKey: PipelineIconKey;
}[] = [
  { key: "data", label: "Data Masuk", iconKey: "attendance" },
  { key: "validation", label: "Validasi", iconKey: "validation" },
  { key: "calculation", label: "Kalkulasi", iconKey: "calculation" },
  { key: "approval", label: "Approval", iconKey: "approval" },
  { key: "payment", label: "Pembayaran", iconKey: "payment" },
  { key: "completed", label: "Selesai", iconKey: "completed" },
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
  if (idx <= 0) return 0; // DRAFT → Data Masuk
  if (idx === 1) return 2; // WAITING → Kalkulasi / mid
  if (idx === 2) return 3; // APPROVED
  if (idx <= 4) return 4; // payment instruction path
  if (idx <= 8) return 4; // confirmation still payment
  return 5; // closed
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/**
 * Builds pipeline stage model for the active payroll status.
 * Percentages and counts are presentation estimates derived from status + headcount.
 * Does not alter payroll calculation logic.
 */
export function buildPipeline(
  status?: PayrollStatus | null,
  opts?: {
    pendingApprovals?: number;
    failedPayments?: number;
    employeeCount?: number;
  },
): PipelineStage[] {
  const total = opts?.employeeCount && opts.employeeCount > 0 ? opts.employeeCount : 0;

  if (!status) {
    return STAGE_DEFS.map((s, i) => ({
      key: s.key,
      label: s.label,
      iconKey: s.iconKey,
      status: i === 0 ? "current" : "upcoming",
      tooltip: "Belum ada periode payroll aktif",
      percent: 0,
      countLabel: total ? `0 / ${formatCount(total)}` : "—",
    }));
  }

  const current = stageIndexForStatus(status);

  // Presentation progress curve aligned to executive journey
  const percentByIndex = (i: number, cur: number): number => {
    if (i < cur) return 100;
    if (i > cur) return 0;
    // current stage partials
    if (status === "WAITING") {
      if (i === 1) return 96;
      if (i === 2) return 82;
      if (i === 3) return 45;
    }
    if (status === "APPROVED" && i === 3) return 100;
    if (i === cur) return cur === 0 ? 100 : 68;
    return 0;
  };

  return STAGE_DEFS.map((s, i) => {
    let st: PipelineStageStatus =
      i < current ? "done" : i === current ? "current" : "upcoming";
    if (status === "REJECTED" && i === 3) st = "critical";
    if (opts?.pendingApprovals && i === 3 && st === "current") st = "warning";
    if (opts?.failedPayments && i === 4 && (st === "current" || st === "done"))
      st = "critical";

    let percent = percentByIndex(i, current);
    if (st === "done") percent = 100;
    if (st === "upcoming") percent = 0;

    // Special presentation when mid-cycle with known headcount
    if (total > 0 && status === "WAITING") {
      const presets = [100, 96, 82, 45, 0, 0];
      percent = presets[i] ?? percent;
      if (i < 3) st = i < 2 ? "done" : i === 2 ? "current" : st;
      if (i === 3) st = "current";
      if (i > 3) st = "upcoming";
      if (i === 2) st = "current";
      if (i < 2) st = "done";
      if (i === 3) st = "current";
    }

    const processed =
      total > 0 ? Math.round((percent / 100) * total) : 0;
    const countLabel =
      total > 0
        ? percent === 0
          ? `0 / ${formatCount(total)}`
          : `${formatCount(processed)} / ${formatCount(total)}`
        : percent > 0
          ? `${percent}%`
          : "—";

    return {
      key: s.key,
      label: s.label,
      iconKey: s.iconKey,
      status: st,
      owner:
        i === 0
          ? "HR Ops"
          : i === 3
            ? "Approver"
            : i >= 4
              ? "Finance"
              : "Payroll",
      completedAt: st === "done" ? "Selesai" : undefined,
      tooltip:
        st === "current"
          ? `${s.label} sedang berjalan`
          : st === "done"
            ? `${s.label} selesai`
            : `${s.label} menunggu`,
      percent,
      countLabel,
    };
  });
}
