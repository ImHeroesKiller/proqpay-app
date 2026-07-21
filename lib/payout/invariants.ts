/**
 * Payout amount invariants (I2-A).
 */

import { createHash } from "crypto";
import { amountsMatch, TOLERANCE } from "@/lib/payout/state-machine";

export function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

export type LineLike = { id: string; netPay: { toString(): string } | number };
export type ItemLike = { amount: { toString(): string } | number; payrollLineId?: string | null };

export function sumLineNets(lines: LineLike[]): number {
  return lines.reduce((s, l) => s + num(l.netPay), 0);
}

export function sumItemAmounts(items: ItemLike[]): number {
  return items.reduce((s, i) => s + num(i.amount), 0);
}

/**
 * content checksum of sorted payrollLineId:netPay pairs.
 */
export function contentChecksum(lines: LineLike[]): string {
  const parts = lines
    .map((l) => `${l.id}:${num(l.netPay).toFixed(2)}`)
    .sort();
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function assertPayoutTotals(input: {
  periodTotalNet: number;
  lines: LineLike[];
  items?: ItemLike[];
}): { lineSum: number; itemSum: number; periodNet: number } {
  const lineSum = sumLineNets(input.lines);
  const periodNet = num(input.periodTotalNet);
  if (!amountsMatch(lineSum, periodNet)) {
    throw new Error(
      `Invariant failed: SUM(PayrollLine.netPay)=${lineSum} ≠ period.totalNet=${periodNet}`,
    );
  }
  if (input.items) {
    const itemSum = sumItemAmounts(input.items);
    if (!amountsMatch(itemSum, lineSum)) {
      throw new Error(
        `Invariant failed: SUM(items)=${itemSum} ≠ SUM(lines)=${lineSum}`,
      );
    }
    if (!amountsMatch(itemSum, periodNet)) {
      throw new Error(
        `Invariant failed: SUM(items)=${itemSum} ≠ period.totalNet=${periodNet}`,
      );
    }
    return { lineSum, itemSum, periodNet };
  }
  return { lineSum, itemSum: lineSum, periodNet };
}

export { TOLERANCE };
