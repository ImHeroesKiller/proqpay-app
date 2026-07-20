/**
 * I1 Master Data unit tests (pure JS mirror of pay-cycle helpers).
 * Run: node scripts/test-master-data.mjs
 */
import assert from "node:assert/strict";

function utcDate(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}
function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}
function clampDay(y, m, day) {
  return Math.min(Math.max(1, day), lastDayOfMonth(y, m));
}
function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

function effectiveRangesOverlap(aFrom, aTo, bFrom, bTo) {
  const aEnd = aTo ?? new Date("9999-12-31T00:00:00.000Z");
  const bEnd = bTo ?? new Date("9999-12-31T00:00:00.000Z");
  return rangesOverlap(aFrom, aEnd, bFrom, bEnd);
}

function validateEffectiveRange(from, to) {
  if (to && to.getTime() < from.getTime()) return "effectiveFrom must be ≤ effectiveTo";
  return null;
}

function parseCustomConfig(raw) {
  if (raw == null || raw.trim() === "") return { ok: true, value: {} };
  try {
    const v = JSON.parse(raw);
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return { ok: false, error: "object" };
    }
    return { ok: true, value: v };
  } catch {
    return { ok: false, error: "json" };
  }
}

function computePeriodSchedule(config, anchor = new Date()) {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const day = anchor.getUTCDate();
  let periodStart;
  let periodEnd;
  switch (config.frequency) {
    case "MONTHLY":
      periodStart = utcDate(y, m, 1);
      periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
      break;
    case "SEMIMONTHLY":
      if (day <= 15) {
        periodStart = utcDate(y, m, 1);
        periodEnd = utcDate(y, m, 15);
      } else {
        periodStart = utcDate(y, m, 16);
        periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
      }
      break;
    case "CUSTOM": {
      let periodDays = 30;
      if (config.customConfig) {
        try {
          const parsed = JSON.parse(config.customConfig);
          if (typeof parsed.periodDays === "number") periodDays = Math.floor(parsed.periodDays);
        } catch {
          /* keep */
        }
      }
      periodStart = utcDate(y, m, day);
      periodEnd = addDays(periodStart, periodDays - 1);
      break;
    }
    default:
      periodStart = utcDate(y, m, 1);
      periodEnd = utcDate(y, m, lastDayOfMonth(y, m));
  }
  const endY = periodEnd.getUTCFullYear();
  const endM = periodEnd.getUTCMonth();
  let paymentDueAt = utcDate(endY, endM, clampDay(endY, endM, config.paymentDay));
  if (paymentDueAt < periodEnd) {
    const ny = endM === 11 ? endY + 1 : endY;
    const nm = endM === 11 ? 0 : endM + 1;
    paymentDueAt = utcDate(ny, nm, clampDay(ny, nm, config.paymentDay));
  }
  return { periodStart, periodEnd, paymentDueAt };
}

assert.equal(validateEffectiveRange(new Date("2026-01-01"), new Date("2026-12-31")), null);
assert.ok(validateEffectiveRange(new Date("2026-06-01"), new Date("2026-01-01")));
assert.equal(
  rangesOverlap(new Date("2026-01-01"), new Date("2026-01-31"), new Date("2026-01-15"), new Date("2026-02-15")),
  true,
);
assert.equal(
  rangesOverlap(new Date("2026-01-01"), new Date("2026-01-31"), new Date("2026-02-01"), new Date("2026-02-28")),
  false,
);
assert.equal(
  effectiveRangesOverlap(new Date("2026-01-01"), null, new Date("2026-06-01"), null),
  true,
);
assert.equal(
  effectiveRangesOverlap(new Date("2026-01-01"), new Date("2026-03-31"), new Date("2026-04-01"), null),
  false,
);

const monthly = computePeriodSchedule(
  { frequency: "MONTHLY", cutoffDay: 25, paymentDay: 28, approvalLagDays: 2 },
  new Date("2026-07-10T00:00:00.000Z"),
);
assert.equal(monthly.periodStart.toISOString().slice(0, 10), "2026-07-01");
assert.equal(monthly.periodEnd.toISOString().slice(0, 10), "2026-07-31");

const semi = computePeriodSchedule(
  { frequency: "SEMIMONTHLY", cutoffDay: 14, paymentDay: 15, approvalLagDays: 1 },
  new Date("2026-07-20T00:00:00.000Z"),
);
assert.equal(semi.periodStart.toISOString().slice(0, 10), "2026-07-16");

assert.equal(parseCustomConfig('{"periodDays":14}').ok, true);
assert.equal(parseCustomConfig("not-json").ok, false);

const custom = computePeriodSchedule(
  {
    frequency: "CUSTOM",
    cutoffDay: 10,
    paymentDay: 12,
    approvalLagDays: 1,
    customConfig: '{"periodDays":14}',
  },
  new Date("2026-07-01T00:00:00.000Z"),
);
assert.equal(custom.periodEnd.toISOString().slice(0, 10), "2026-07-14");

console.log("test-master-data: all passed");
