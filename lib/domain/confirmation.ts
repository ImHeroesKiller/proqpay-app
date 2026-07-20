import type {
  PayrollFundingModel,
  PayrollPeriod,
  WorkflowStep,
} from "@/types";

/**
 * Canonical post-approval confirmation workflow.
 * Funds always flow: (Partner →) Client bank → Employees.
 * ProQPay never pays employees directly from a funding partner.
 */
export function buildConfirmationWorkflow(
  period: PayrollPeriod,
  confirmationStatus?: string | null,
): WorkflowStep[] {
  const status = period.status;
  const funding = period.fundingModel;
  const pi = period.paymentInstructionStatus;
  const conf = confirmationStatus ?? period.confirmationStatus ?? null;

  const doneIf = (cond: boolean, currentWhen: boolean): WorkflowStep["state"] =>
    cond ? "done" : currentWhen ? "current" : "upcoming";

  const approved = [
    "APPROVED",
    "LOCKED",
    "DISBURSED",
    "PAYMENT_INSTRUCTION_GENERATED",
    "WAITING_CLIENT_TRANSFER",
    "TRANSFER_PROOF_UPLOADED",
    "UNDER_VERIFICATION",
    "VERIFIED",
    "CLOSED",
  ].includes(status);

  const piGenerated =
    [
      "READY",
      "SUBMITTED",
      "PROCESSING",
      "EXECUTED",
    ].includes(pi) ||
    [
      "PAYMENT_INSTRUCTION_GENERATED",
      "WAITING_CLIENT_TRANSFER",
      "TRANSFER_PROOF_UPLOADED",
      "UNDER_VERIFICATION",
      "VERIFIED",
      "CLOSED",
    ].includes(status);

  const steps: WorkflowStep[] = [
    {
      key: "approved",
      label: "Approved",
      state: doneIf(approved, status === "WAITING"),
    },
  ];

  if (funding === "WORKING_CAPITAL") {
    const funded = ["ALLOCATED", "FUNDED", "SETTLED"].includes(
      period.fundingStatus,
    ) ||
      ["FUNDED", "DISBURSED"].includes(period.fundingStatus as string);
    steps.push(
      {
        key: "funding_approved",
        label: "Funding approved",
        state: doneIf(
          ["APPROVED", "ALLOCATED", "FUNDED", "SETTLED"].includes(
            period.fundingStatus,
          ),
          approved && period.fundingStatus === "REQUESTED",
        ),
      },
      {
        key: "funds_released",
        label: "Funds released to client bank",
        state: doneIf(
          funded || period.fundingStatus === "FUNDED",
          period.fundingStatus === "ALLOCATED",
        ),
      },
    );
  }

  steps.push({
    key: "pi_generated",
    label: "Payment instruction generated",
    state: doneIf(piGenerated, approved && !piGenerated),
  });

  const isWaitingClientTransfer = status === "WAITING_CLIENT_TRANSFER";
  const waitingTransfer =
    isWaitingClientTransfer ||
    (piGenerated && !conf && status !== "CLOSED" && status !== "VERIFIED");
  const proofUploaded =
    conf === "UPLOADED" ||
    conf === "UNDER_REVIEW" ||
    conf === "VERIFIED" ||
    conf === "NEED_REVISION" ||
    conf === "REJECTED" ||
    [
      "TRANSFER_PROOF_UPLOADED",
      "UNDER_VERIFICATION",
      "VERIFIED",
      "CLOSED",
    ].includes(status);
  const underReview =
    conf === "UNDER_REVIEW" || status === "UNDER_VERIFICATION";
  const verified =
    conf === "VERIFIED" || status === "VERIFIED" || status === "CLOSED";
  const closed = status === "CLOSED" || status === "DISBURSED";

  steps.push(
    {
      key: "waiting_transfer",
      label: "Waiting client transfer",
      state: doneIf(
        proofUploaded || verified || closed,
        waitingTransfer || isWaitingClientTransfer,
      ),
    },
    {
      key: "proof_uploaded",
      label: "Transfer proof uploaded",
      state: doneIf(
        underReview || verified || closed || conf === "REJECTED",
        conf === "UPLOADED" || status === "TRANSFER_PROOF_UPLOADED",
      ),
    },
    {
      key: "verification",
      label: "Verification",
      state: doneIf(
        verified || closed,
        underReview || conf === "NEED_REVISION" || conf === "REJECTED",
      ),
    },
  );

  if (funding === "WORKING_CAPITAL") {
    steps.push(
      {
        key: "settlement",
        label: "Settlement",
        state: doneIf(
          closed,
          verified && period.fundingStatus !== "SETTLED",
        ),
      },
      {
        key: "revenue_share",
        label: "Revenue sharing",
        state: doneIf(closed, verified),
      },
    );
  }

  steps.push({
    key: "closed",
    label: "Payroll closed",
    state: doneIf(closed, verified && !closed),
  });

  return steps;
}

export function executionModelLabel(
  model: string | null | undefined,
): string {
  switch (model) {
    case "CLIENT_SELF_TRANSFER":
      return "Client self-transfer";
    case "WORKING_CAPITAL":
      return "Working capital → client bank → employees";
    case "BANK_API":
      return "Bank API";
    case "MANUAL":
      return "Manual";
    default:
      return model ?? "—";
  }
}

export function fundingFlowNote(funding: PayrollFundingModel): string {
  if (funding === "WORKING_CAPITAL") {
    return "Capital partner funds the client bank account. The client then transfers salaries to employees and uploads proof of transfer.";
  }
  return "Client transfers salaries from the client bank account after downloading the payment instruction, then uploads proof of transfer for ProQPay verification.";
}
