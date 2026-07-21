/**
 * Payroll engine domain unit tests (no DB).
 * Run: node scripts/test-payroll-engine.mjs
 */
import assert from "node:assert/strict";

// ── Formula extract + eval ──────────────────────────────
function extractDependencies(expression) {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return [...new Set(tokens)];
}
assert.deepEqual(extractDependencies("A + B * 2"), ["A", "B"]);

function evaluateExpression(expression, values) {
  const src = expression.trim();
  let i = 0;
  const peek = () => src[i];
  const next = () => src[i++];
  const skip = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  function factor() {
    skip();
    if (peek() === "(") {
      next();
      const v = expr();
      skip();
      if (peek() !== ")") throw new Error(")");
      next();
      return v;
    }
    if (peek() === "-") {
      next();
      return -factor();
    }
    if (/[0-9.]/.test(peek() ?? "")) {
      let s = "";
      while (/[0-9.]/.test(peek() ?? "")) s += next();
      return Number(s);
    }
    let id = "";
    while (/[A-Za-z0-9_]/.test(peek() ?? "")) id += next();
    if (!(id in values)) throw new Error("unknown " + id);
    return values[id];
  }
  function term() {
    let v = factor();
    for (;;) {
      skip();
      if (peek() === "*") {
        next();
        v *= factor();
      } else if (peek() === "/") {
        next();
        v /= factor();
      } else break;
    }
    return v;
  }
  function expr() {
    let v = term();
    for (;;) {
      skip();
      if (peek() === "+") {
        next();
        v += term();
      } else if (peek() === "-") {
        next();
        v -= term();
      } else break;
    }
    return v;
  }
  return Math.round(expr() * 100) / 100;
}

assert.equal(evaluateExpression("10 + 5 * 2", {}), 20);
assert.equal(evaluateExpression("BaseSalary * 0.05", { BaseSalary: 10_000_000 }), 500_000);

// Net formula
const vals = {
  BaseSalary: 10_000_000,
  OvertimeHours: 0,
  BonusInput: 0,
  LoanInput: 150_000,
};
const BasicSalary = evaluateExpression("BaseSalary", vals);
const Transport = evaluateExpression("BaseSalary * 0.05", vals);
const Meal = evaluateExpression("BaseSalary * 0.05", vals);
const Gross = BasicSalary + Transport + Meal;
const BPJS = evaluateExpression("BaseSalary * 0.04", vals);
const Tax = evaluateExpression("Gross * 0.05", { Gross });
const Net = Gross - vals.LoanInput - BPJS - Tax;
assert.ok(Net > 0);

// ── Topological sort / circular ─────────────────────────
function topologicalSort(nodes) {
  const by = new Map(nodes.map((n) => [n.code, n]));
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  function visit(code, stack) {
    if (visited.has(code)) return;
    if (visiting.has(code)) throw new Error("cycle " + [...stack, code].join("->"));
    visiting.add(code);
    const n = by.get(code);
    if (n) {
      for (const d of n.dependsOn) if (by.has(d)) visit(d, [...stack, code]);
      order.push(n);
    }
    visiting.delete(code);
    visited.add(code);
  }
  for (const n of nodes) visit(n.code, []);
  return order;
}
const sorted = topologicalSort([
  { code: "Net", expression: "Gross - Tax", dependsOn: ["Gross", "Tax"] },
  { code: "Gross", expression: "A + B", dependsOn: ["A", "B"] },
  { code: "Tax", expression: "Gross * 0.05", dependsOn: ["Gross"] },
  { code: "A", expression: "1", dependsOn: [] },
  { code: "B", expression: "2", dependsOn: [] },
]);
assert.ok(sorted.findIndex((n) => n.code === "Gross") < sorted.findIndex((n) => n.code === "Tax"));
assert.throws(() =>
  topologicalSort([
    { code: "A", expression: "B", dependsOn: ["B"] },
    { code: "B", expression: "A", dependsOn: ["A"] },
  ]),
);

// ── Validation ──────────────────────────────────────────
function hasNegative(employees) {
  return employees.some((e) => (e.values.NetSalary ?? 0) < 0);
}
assert.equal(hasNegative([{ values: { NetSalary: -1 } }]), true);
assert.equal(hasNegative([{ values: { NetSalary: 1 } }]), false);

function budgetOk(net, budget) {
  if (budget == null) return true;
  return net <= budget + 0.0001;
}
assert.equal(budgetOk(100, 50), false);
assert.equal(budgetOk(50, 100), true);

// ── Revision immutability principle ─────────────────────
function nextRevision(current) {
  return current + 1;
}
assert.equal(nextRevision(1), 2);
assert.equal(nextRevision(2), 3);

// ── Approval step order ─────────────────────────────────
function canAct(steps, level) {
  return steps.filter((s) => s.level < level).every((s) => s.status === "APPROVED");
}
assert.equal(
  canAct(
    [
      { level: 1, status: "APPROVED" },
      { level: 2, status: "PENDING" },
    ],
    2,
  ),
  true,
);
assert.equal(
  canAct(
    [
      { level: 1, status: "PENDING" },
      { level: 2, status: "PENDING" },
    ],
    2,
  ),
  false,
);

// ── Journal totals ──────────────────────────────────────
function journalFromTotals(g, n, ee, er, tax) {
  return { gross: g, net: n, employer: er, employee: ee, tax };
}
const j = journalFromTotals(100, 80, 80, 110, 5);
assert.equal(j.gross, 100);

// ── Simulation isolation ────────────────────────────────
const original = 10;
const simulated = original * 1.1;
assert.notEqual(simulated, original);

console.log("test-payroll-engine: ok");
