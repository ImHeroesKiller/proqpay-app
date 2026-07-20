import type {
  PayrollFundingModel,
  PayrollPeriod,
  WorkflowStep,
} from "@/types";

/**
 * Canonical payroll workflow steps with funding-model branching.
 * Self-funded periods skip working-capital steps.
 */
export function buildPayrollWorkflow(period: PayrollPeriod): WorkflowStep[] {
  const status = period.status;
  const funding = period.fundingModel;
  const fundStatus = period.fundingStatus;
  const pi = period.paymentInstructionStatus;
  const recon = period.reconciliationStatus;

  const prepared =
    status !== "DRAFT" || period.employeeCount > 0 ? "done" : "current";
  const validated =
    status === "DRAFT" && period.employeeCount === 0
      ? "upcoming"
      : ["WAITING", "APPROVED", "LOCKED", "DISBURSED"].includes(status)
        ? "done"
        : prepared === "done"
          ? "current"
          : "upcoming";
  const approved = ["APPROVED", "LOCKED", "DISBURSED"].includes(status)
    ? "done"
    : status === "WAITING"
      ? "current"
      : status === "REJECTED"
        ? "upcoming"
        : "upcoming";

  const base: WorkflowStep[] = [
    { key: "prepared", label: "Payroll prepared", state: prepared as WorkflowStep["state"] },
    { key: "validated", label: "Validated", state: validated as WorkflowStep["state"] },
    { key: "approved", label: "Approved", state: approved as WorkflowStep["state"] },
  ];

  if (funding === "WORKING_CAPITAL") {
    const wcRequested = [
      "REQUESTED",
      "UNDER_REVIEW",
      "APPROVED",
      "ALLOCATED",
      "FUNDED",
      "SETTLED",
    ].includes(fundStatus)
      ? "done"
      : approved === "done"
        ? "current"
        : "upcoming";
    const wcAllocated = ["ALLOCATED", "FUNDED", "SETTLED"].includes(fundStatus)
      ? "done"
      : fundStatus === "APPROVED"
        ? "current"
        : "upcoming";
    base.push(
      {
        key: "wc_requested",
        label: "Working capital requested",
        state: wcRequested as WorkflowStep["state"],
      },
      {
        key: "wc_allocated",
        label: "Funding allocated",
        state: wcAllocated as WorkflowStep["state"],
      },
    );
  } else {
    base.push({
      key: "client_funded",
      label: "Client-funded (source of funds: client bank)",
      state: approved === "done" ? "done" : "upcoming",
    });
  }

  const instruction =
    ["READY", "SUBMITTED", "PROCESSING", "EXECUTED"].includes(pi) ||
    pi === "PARTIALLY_FAILED"
      ? "done"
      : pi === "DRAFT"
        ? "current"
        : approved === "done" &&
            (funding === "SELF_FUNDED" ||
              ["FUNDED", "ALLOCATED", "SETTLED"].includes(fundStatus))
          ? "current"
          : "upcoming";

  const executed =
    pi === "EXECUTED" || status === "DISBURSED"
      ? "done"
      : pi === "PROCESSING" || pi === "SUBMITTED"
        ? "current"
        : "upcoming";

  const reconciled =
    recon === "RECONCILED"
      ? "done"
      : recon === "IN_PROGRESS" || recon === "EXCEPTION"
        ? "current"
        : executed === "done"
          ? "current"
          : "upcoming";

  base.push(
    {
      key: "payment_instruction",
      label: "Payment instruction",
      state: instruction as WorkflowStep["state"],
    },
    {
      key: "executed",
      label: funding === "WORKING_CAPITAL" ? "Executed (funded)" : "Executed",
      state: executed as WorkflowStep["state"],
    },
    {
      key: "reconciled",
      label:
        funding === "WORKING_CAPITAL"
          ? "Reconciled / settlement"
          : "Reconciled",
      state: reconciled as WorkflowStep["state"],
    },
  );

  return base;
}

export function fundingModelLabel(model: PayrollFundingModel): string {
  return model === "SELF_FUNDED" ? "Client-funded" : "Working capital";
}

export function fundingModelDescription(model: PayrollFundingModel): string {
  if (model === "SELF_FUNDED") {
    return "Payroll funds remain in the client's designated bank account. ProQPay orchestrates validation, approval, payment instructions, execution monitoring, reconciliation, and audit.";
  }
  return "Optional temporary payroll-funding support. Requires a separately approved working-capital request and capital allocation before funded execution.";
}
