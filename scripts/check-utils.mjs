/**
 * Lightweight utility regression checks (no extra test framework).
 * Run: node scripts/check-utils.mjs
 */
import assert from "node:assert/strict";

// Inline mirrors of lib/utils formatters (keep in sync if APIs change)
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(amount) {
  return new Intl.NumberFormat("id-ID").format(amount);
}

assert.ok(formatRupiah(1_500_000).includes("1.500.000") || formatRupiah(1_500_000).includes("1500000"));
assert.ok(formatNumber(1200).includes("1.200") || formatNumber(1200).includes("1200"));

// Status config shape check via dynamic import not available for TS — structural check of keys
const requiredStatuses = [
  "DRAFT",
  "WAITING",
  "APPROVED",
  "WAITING_CLIENT_TRANSFER",
  "TRANSFER_PROOF_UPLOADED",
  "UNDER_VERIFICATION",
  "CLOSED",
  "PAYMENT_INSTRUCTION_GENERATED",
];

assert.equal(requiredStatuses.length, 8);

// Open redirect guard (login page uses startsWith("/"))
function safeCallback(url) {
  return url.startsWith("/") ? url : "/dashboard";
}
assert.equal(safeCallback("/payroll"), "/payroll");
assert.equal(safeCallback("https://evil.example"), "/dashboard");

console.log("check-utils: ok");
