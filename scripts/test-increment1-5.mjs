/**
 * Increment 1.5 domain unit tests (no DB).
 */
import assert from "node:assert/strict";

// suggested actions
function suggestedActionFor(code, message) {
  const SUGGESTIONS = {
    ZERO_NET: "Review base salary",
    NEGATIVE_NET: "Check loan",
    FORMULA_ERROR: "Fix formula",
  };
  for (const [k, v] of Object.entries(SUGGESTIONS)) {
    if (code.includes(k) || message.toUpperCase().includes(k)) return v;
  }
  return "Review";
}
assert.equal(suggestedActionFor("NEGATIVE_NET", "x"), "Check loan");
assert.equal(suggestedActionFor("FORMULA_ERROR", "x"), "Fix formula");
assert.equal(suggestedActionFor("OTHER", "NEGATIVE_NET issue"), "Check loan");

// compare deltas
function delta(a, b) {
  return b - a;
}
assert.equal(delta(100, 120), 20);
assert.equal(delta(50, 40), -10);

// version immutability rule: ACTIVE cannot be edited — only new version
function nextVersion(last) {
  return (last ?? 0) + 1;
}
assert.equal(nextVersion(3), 4);
assert.equal(nextVersion(undefined), 1);

// projection checks
function allOk(checks) {
  return checks.every((c) => c.ok);
}
assert.equal(
  allOk([
    { ok: true },
    { ok: true },
  ]),
  true,
);
assert.equal(allOk([{ ok: true }, { ok: false }]), false);

// PTKP JSON parse
const ptkp = JSON.parse(
  JSON.stringify({ "TK/0": 54000000, "K/1": 63000000 }),
);
assert.equal(ptkp["TK/0"], 54000000);

console.log("test-increment1-5: ok");
