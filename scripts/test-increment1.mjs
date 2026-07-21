/**
 * Increment 1 domain unit tests (no DB).
 * Run: node scripts/test-increment1.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// ── CSV parse (mirror import-service) ───────────────────
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) throw new Error("need header+row");
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

const sample = `employee_code,work_date,type,hours_worked,overtime_hours
ATE-1007,2026-08-01,PRESENT,8,2
ATE-1007,2026-08-02,PRESENT,8,0
ATE-1032,2026-08-01,LEAVE,0,0
`;
const parsed = parseCsv(sample);
assert.equal(parsed.rows.length, 3);
assert.equal(parsed.rows[0].employee_code, "ATE-1007");
assert.equal(parsed.rows[0].overtime_hours, "2");

// quoted CSV
const q = parseCsv(`employee_code,notes\n"ATE-1","hello, world"\n`);
assert.equal(q.rows[0].notes, "hello, world");

// checksum idempotency
function checksum(text) {
  const n = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(n).digest("hex");
}
// same content same hash when normalized (CRLF vs LF)
const a = checksum("a,b\n1,2\n");
const b = checksum("a,b\r\n1,2\r\n");
assert.equal(a, b);

// validation codes catalog
const CODES = new Set([
  "MANDATORY_FIELD",
  "EMPLOYEE_NOT_FOUND",
  "INVALID_DATE",
  "DATE_OUT_OF_PERIOD",
  "ASSIGNMENT_INVALID",
  "INVALID_TYPE",
  "INVALID_HOURS",
  "INVALID_OT",
  "PROJECT_INVALID",
  "SITE_INVALID",
  "DUPLICATE_IN_FILE",
]);
assert.ok(CODES.has("EMPLOYEE_NOT_FOUND"));

// statutory graph rates injection
function buildBpjsEmpRate(k, jht, jp) {
  return k + jht + jp;
}
assert.ok(Math.abs(buildBpjsEmpRate(0.01, 0.02, 0.01) - 0.04) < 1e-9);

// ADR projection mapping
function mapComponents(v) {
  return {
    baseSalary: v.BasicSalary ?? 0,
    allowances: (v.TransportAllowance ?? 0) + (v.MealAllowance ?? 0),
    overtime: v.Overtime ?? 0,
    bonuses: v.Bonus ?? 0,
    tax: v.PPH21 ?? 0,
    bpjs: v.BPJSEmployee ?? 0,
    netPay: v.NetSalary ?? 0,
  };
}
const m = mapComponents({
  BasicSalary: 10_000_000,
  TransportAllowance: 500_000,
  MealAllowance: 500_000,
  Overtime: 100_000,
  Bonus: 0,
  PPH21: 550_000,
  BPJSEmployee: 400_000,
  NetSalary: 10_150_000,
});
assert.equal(m.allowances, 1_000_000);
assert.equal(m.netPay, 10_150_000);

console.log("test-increment1: ok");
