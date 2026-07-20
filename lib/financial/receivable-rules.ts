/**
 * Receivable aging & status — pure domain.
 */

export type ReceivableStatusCode =
  | "CURRENT"
  | "PARTIAL"
  | "OVERDUE"
  | "COLLECTED"
  | "WRITTEN_OFF";

export function agingDays(dueDate: Date | null, now = new Date()): number {
  if (!dueDate) return 0;
  const start = new Date(dueDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export function agingBucket(days: number): string {
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function deriveReceivableStatus(input: {
  outstanding: number;
  grandTotal: number;
  dueDate: Date | null;
  now?: Date;
}): ReceivableStatusCode {
  if (input.outstanding <= 0.0001) return "COLLECTED";
  const days = agingDays(input.dueDate, input.now);
  if (days > 0) return "OVERDUE";
  if (input.outstanding + 0.0001 < input.grandTotal) return "PARTIAL";
  return "CURRENT";
}

export function applyPaymentToOutstanding(
  outstanding: number,
  allocate: number,
): { nextOutstanding: number; applied: number } {
  if (allocate < 0) throw new Error("Allocation cannot be negative");
  if (allocate - outstanding > 0.0001) {
    throw new Error("Payment allocation exceeds outstanding");
  }
  const applied = Math.min(allocate, outstanding);
  return { nextOutstanding: Math.max(0, outstanding - applied), applied };
}
