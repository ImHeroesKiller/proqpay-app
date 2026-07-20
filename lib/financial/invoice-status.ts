/**
 * Invoice status machine — pure domain rules (no I/O).
 */

export type InvoiceStatusCode =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "CANCELLED";

/** Allowed single-step transitions (no skipping). */
const TRANSITIONS: Record<InvoiceStatusCode, InvoiceStatusCode[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED", "VOID"],
  PENDING_APPROVAL: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "VOID"],
  PAID: [], // terminal operational success
  OVERDUE: ["PARTIALLY_PAID", "PAID", "VOID"],
  VOID: [],
  CANCELLED: [],
};

export function canTransitionInvoice(
  from: InvoiceStatusCode,
  to: InvoiceStatusCode,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertInvoiceTransition(
  from: InvoiceStatusCode,
  to: InvoiceStatusCode,
): void {
  if (!canTransitionInvoice(from, to)) {
    throw new Error(`Invalid invoice status transition: ${from} → ${to}`);
  }
}

/** Statuses that create / maintain receivables. */
export function createsReceivable(status: InvoiceStatusCode): boolean {
  return (
    status === "ISSUED" ||
    status === "PARTIALLY_PAID" ||
    status === "OVERDUE" ||
    status === "PAID"
  );
}

/** Draft payroll must not become receivable — enforced when issuing from payroll. */
export function payrollStatusAllowsInvoice(payrollStatus: string): boolean {
  const blocked = new Set(["DRAFT"]);
  return !blocked.has(payrollStatus);
}

export function paymentStatusFromAmounts(
  grandTotal: number,
  paidAmount: number,
  current: InvoiceStatusCode,
): InvoiceStatusCode {
  if (paidAmount <= 0) {
    if (current === "OVERDUE") return "OVERDUE";
    return "ISSUED";
  }
  if (paidAmount + 0.0001 >= grandTotal) return "PAID";
  return "PARTIALLY_PAID";
}

export function formatInvoiceNumber(
  prefix: string,
  year: number,
  month: number,
  seq: number,
): string {
  const mm = String(month).padStart(2, "0");
  const n = String(seq).padStart(6, "0");
  return `${prefix}-${year}-${mm}-${n}`;
}
