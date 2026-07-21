/**
 * I2-A payout control plane unit tests (no DB).
 */
import assert from "node:assert/strict";

function deriveControlPhase(pi) {
  if (pi.executionStatus === "CANCELLED") return "CANCELLED";
  if (
    ["SUBMITTED", "PROCESSING", "EXECUTED", "PARTIALLY_FAILED", "FAILED"].includes(
      pi.executionStatus,
    )
  ) {
    return "IN_EXECUTION";
  }
  if (pi.approvalStatus === "APPROVED" && pi.executionStatus === "READY") {
    return "APPROVED";
  }
  if (pi.approvalStatus === "REJECTED") return "REJECTED";
  if (pi.approvalStatus === "PENDING" && pi.submittedAt) return "SUBMITTED";
  if (pi.approvalStatus === "PENDING" && !pi.submittedAt) return "DRAFT";
  return "UNKNOWN";
}

const ALLOWED = {
  DRAFT: ["SUBMIT", "CANCEL"],
  SUBMITTED: ["APPROVE", "REJECT", "CANCEL"],
  APPROVED: [],
  REJECTED: ["RESUBMIT", "CANCEL"],
  CANCELLED: [],
  IN_EXECUTION: [],
  UNKNOWN: [],
};

function canTransition(phase, action) {
  return (ALLOWED[phase] ?? []).includes(action);
}

// phases
assert.equal(
  deriveControlPhase({
    approvalStatus: "PENDING",
    executionStatus: "DRAFT",
    submittedAt: null,
  }),
  "DRAFT",
);
assert.equal(
  deriveControlPhase({
    approvalStatus: "PENDING",
    executionStatus: "DRAFT",
    submittedAt: new Date(),
  }),
  "SUBMITTED",
);
assert.equal(
  deriveControlPhase({
    approvalStatus: "APPROVED",
    executionStatus: "READY",
    submittedAt: new Date(),
  }),
  "APPROVED",
);
assert.equal(
  deriveControlPhase({
    approvalStatus: "REJECTED",
    executionStatus: "DRAFT",
    submittedAt: null,
  }),
  "REJECTED",
);

// transitions
assert.equal(canTransition("DRAFT", "SUBMIT"), true);
assert.equal(canTransition("DRAFT", "APPROVE"), false);
assert.equal(canTransition("SUBMITTED", "APPROVE"), true);
assert.equal(canTransition("APPROVED", "SUBMIT"), false);
assert.equal(canTransition("APPROVED", "CANCEL"), false);
assert.equal(canTransition("REJECTED", "RESUBMIT"), true);

// invariant tolerance
function match(a, b, tol = 0.02) {
  return Math.abs(a - b) <= tol;
}
assert.equal(match(100, 100.01), true);
assert.equal(match(100, 100.05), false);

// SoD
function canSelfApprove(makerId, actorId, role, comment) {
  if (makerId !== actorId) return true;
  if (role === "SUPER_ADMIN" && comment?.trim()) return true;
  return false;
}
assert.equal(canSelfApprove("a", "a", "PAYROLL_ADMIN", "x"), false);
assert.equal(canSelfApprove("a", "a", "SUPER_ADMIN", ""), false);
assert.equal(canSelfApprove("a", "a", "SUPER_ADMIN", "override"), true);
assert.equal(canSelfApprove("a", "b", "FINANCE", ""), true);

console.log("test-payout-i2a: ok");
