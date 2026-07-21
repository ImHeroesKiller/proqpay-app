/**
 * Financial core domain unit tests (no DB required).
 * Run: node scripts/test-financial.mjs
 */
import assert from "node:assert/strict";

// ── Invoice transitions ─────────────────────────────────
const TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED", "VOID"],
  PENDING_APPROVAL: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "VOID"],
  PAID: [],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "VOID"],
  VOID: [],
  CANCELLED: [],
};

function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

assert.equal(canTransition("DRAFT", "PENDING_APPROVAL"), true);
assert.equal(canTransition("DRAFT", "ISSUED"), false);
assert.equal(canTransition("ISSUED", "PAID"), true);
assert.equal(canTransition("PAID", "ISSUED"), false);

// ── Numbering ───────────────────────────────────────────
function formatInvoiceNumber(prefix, year, month, seq) {
  return `${prefix}-${year}-${String(month).padStart(2, "0")}-${String(seq).padStart(6, "0")}`;
}
assert.equal(formatInvoiceNumber("INV", 2026, 8, 1), "INV-2026-08-000001");
assert.equal(formatInvoiceNumber("INV", 2026, 8, 42), "INV-2026-08-000042");

// Uniqueness of sequence values in a month
const seen = new Set();
for (let i = 1; i <= 20; i++) {
  const n = formatInvoiceNumber("INV", 2026, 8, i);
  assert.equal(seen.has(n), false);
  seen.add(n);
}

// ── Payment allocation ──────────────────────────────────
function applyPayment(outstanding, allocate) {
  if (allocate < 0) throw new Error("neg");
  if (allocate - outstanding > 0.0001) throw new Error("exceeds");
  return Math.max(0, outstanding - allocate);
}
assert.equal(applyPayment(1_000_000, 400_000), 600_000);
assert.throws(() => applyPayment(100, 200));

// ── Receivable aging ────────────────────────────────────
function agingDays(due, now) {
  if (!due) return 0;
  const s = new Date(due);
  s.setHours(0, 0, 0, 0);
  const e = new Date(now);
  e.setHours(0, 0, 0, 0);
  return Math.floor((e - s) / 86400000);
}
function deriveStatus(outstanding, grand, due, now) {
  if (outstanding <= 0.0001) return "COLLECTED";
  if (agingDays(due, now) > 0) return "OVERDUE";
  if (outstanding + 0.0001 < grand) return "PARTIAL";
  return "CURRENT";
}
const now = new Date("2026-08-20");
assert.equal(
  deriveStatus(100, 100, new Date("2026-08-10"), now),
  "OVERDUE",
);
assert.equal(
  deriveStatus(0, 100, new Date("2026-08-10"), now),
  "COLLECTED",
);
assert.equal(
  deriveStatus(50, 100, new Date("2026-09-01"), now),
  "PARTIAL",
);

// ── Working capital settlement ──────────────────────────
function applySettlement(approved, repaid, amount) {
  const remaining = Math.max(0, approved - repaid);
  if (amount > remaining + 0.0001) throw new Error("exceeds");
  return { nextRepaid: repaid + amount, remaining: remaining - amount };
}
assert.deepEqual(applySettlement(1_000_000, 0, 400_000), {
  nextRepaid: 400_000,
  remaining: 600_000,
});
assert.throws(() => applySettlement(100, 0, 200));

// Draft payroll cannot invoice
function payrollAllowsInvoice(status) {
  return status !== "DRAFT";
}
assert.equal(payrollAllowsInvoice("DRAFT"), false);
assert.equal(payrollAllowsInvoice("CLOSED"), true);
assert.equal(payrollAllowsInvoice("APPROVED"), true);

console.log("test-financial: ok");
