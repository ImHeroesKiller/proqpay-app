/**
 * Working capital exposure / settlement — pure domain.
 */

export function remainingExposure(input: {
  approvedAmount: number;
  repaidAmount: number;
}): number {
  return Math.max(0, input.approvedAmount - input.repaidAmount);
}

export function applySettlement(input: {
  approvedAmount: number;
  repaidAmount: number;
  settlementAmount: number;
}): { nextRepaid: number; remaining: number } {
  if (input.settlementAmount <= 0) {
    throw new Error("Settlement amount must be positive");
  }
  const remaining = remainingExposure(input);
  if (input.settlementAmount - remaining > 0.0001) {
    throw new Error("Settlement exceeds remaining exposure");
  }
  const nextRepaid = input.repaidAmount + input.settlementAmount;
  return {
    nextRepaid,
    remaining: Math.max(0, input.approvedAmount - nextRepaid),
  };
}

export function settlementStatusFromAmounts(
  approved: number,
  repaid: number,
): "NOT_STARTED" | "PENDING" | "PARTIAL" | "COMPLETE" {
  if (repaid <= 0) return approved > 0 ? "PENDING" : "NOT_STARTED";
  if (repaid + 0.0001 >= approved) return "COMPLETE";
  return "PARTIAL";
}
