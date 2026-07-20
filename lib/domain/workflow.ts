import type {
  PayrollFundingModel,
  PayrollPeriod,
  WorkflowStep,
} from "@/types";
import { buildConfirmationWorkflow } from "@/lib/domain/confirmation";

/**
 * Canonical payroll workflow:
 * prepare → validate → approve → (optional WC to client bank) →
 * payment instruction → client transfer → proof → verification → close
 *
 * Funds never flow Funding Partner → Employee directly.
 */
export function buildPayrollWorkflow(period: PayrollPeriod): WorkflowStep[] {
  const status = period.status;

  const prepared =
    status !== "DRAFT" || period.employeeCount > 0 ? "done" : "current";
  const validated =
    status === "DRAFT" && period.employeeCount === 0
      ? "upcoming"
      : status !== "DRAFT"
        ? "done"
        : prepared === "done"
          ? "current"
          : "upcoming";
  const approved = ![
    "DRAFT",
    "WAITING",
    "REJECTED",
  ].includes(status)
    ? "done"
    : status === "WAITING"
      ? "current"
      : "upcoming";

  const pre: WorkflowStep[] = [
    { key: "prepared", label: "Payroll prepared", state: prepared },
    { key: "validated", label: "Validated", state: validated },
    { key: "approved", label: "Approved", state: approved },
  ];

  const confirmationSteps = buildConfirmationWorkflow(period).filter(
    (s) => s.key !== "approved",
  );

  return [...pre, ...confirmationSteps];
}

export function fundingModelLabel(model: PayrollFundingModel): string {
  return model === "SELF_FUNDED"
    ? "Client self-transfer"
    : "Working capital";
}

export function fundingModelDescription(model: PayrollFundingModel): string {
  if (model === "SELF_FUNDED") {
    return "Client downloads the payment instruction, transfers salaries from the client bank account, then uploads proof of transfer for ProQPay verification before payroll is closed.";
  }
  return "After funding is approved, capital is released to the client bank. The client then transfers salaries to employees and uploads proof. Settlement and revenue sharing follow verification. Partner funds never go directly to employees.";
}
