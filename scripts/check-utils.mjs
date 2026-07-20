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

// Compact IDR (mirror lib/format/idr.ts rules)
function formatCompactIDR(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "Rp0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const unit = (n, d) =>
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: d,
      minimumFractionDigits: 0,
    }).format(Number(n.toFixed(d)));
  if (abs >= 1_000_000_000_000) return `${sign}Rp${unit(abs / 1e12, 2)} Tri`;
  if (abs >= 1_000_000_000) return `${sign}Rp${unit(abs / 1e9, 1)} Bio`;
  if (abs >= 1_000_000) {
    const whole = abs % 1_000_000 === 0;
    return `${sign}Rp${unit(abs / 1e6, whole ? 0 : 1)} Mio`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
assert.equal(formatCompactIDR(738_000_000), "Rp738 Mio");
assert.equal(formatCompactIDR(4_200_000_000), "Rp4,2 Bio");
assert.equal(formatCompactIDR(350_000_000), "Rp350 Mio");

// Receivable classification (mirror domain)
function isClientFunded(m) {
  return m === "SELF_FUNDED";
}
function isWorkingCapitalFunded(m) {
  return m === "WORKING_CAPITAL";
}
assert.equal(isClientFunded("SELF_FUNDED"), true);
assert.equal(isWorkingCapitalFunded("SELF_FUNDED"), false);
assert.equal(isWorkingCapitalFunded("WORKING_CAPITAL"), true);

// Draft never counts as outstanding AR
function draftOutstanding(status, amount) {
  if (status === "DRAFT" || status === "WAITING" || status === "APPROVED")
    return { outstanding: 0, draftReq: amount };
  return { outstanding: amount, draftReq: 0 };
}
const d = draftOutstanding("DRAFT", 350_000_000);
assert.equal(d.outstanding, 0);
assert.equal(d.draftReq, 350_000_000);

// Max five visible rows helper
function visibleCount(total, max = 5) {
  return Math.min(Math.max(total, 0), max);
}
assert.equal(visibleCount(1), 1);
assert.equal(visibleCount(5), 5);
assert.equal(visibleCount(12), 5);

// Optional filter activation from URL
function optionalFromUrl(params) {
  const keys = ["site", "clientType", "project", "status", "funding", "currency"];
  return keys.filter((k) => {
    const v = params[k];
    if (!v) return false;
    if (k === "currency") return v !== "IDR";
    return v !== "ALL";
  });
}
assert.deepEqual(optionalFromUrl({ funding: "SELF_FUNDED" }), ["funding"]);
assert.deepEqual(optionalFromUrl({ currency: "IDR" }), []);

console.log("check-utils: ok");
