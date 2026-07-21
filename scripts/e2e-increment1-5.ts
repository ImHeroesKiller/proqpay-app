/**
 * Integration E2E Increment 1.5 — engine completeness.
 * Run: pnpm exec tsx scripts/e2e-increment1-5.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  createTaxConfigVersion,
  createBpjsConfigVersion,
} from "../lib/payroll-engine/statutory-config-service";
import { createFormulaVersion } from "../lib/payroll-engine/formula-service";
import { createPayrollPeriodFromGroup } from "../lib/master-data/service";
import { materializePayrollLines } from "../lib/payroll/population";
import { runPeriodPayrollCalculation } from "../lib/payroll/period-run";
import {
  compareCalculations,
  listPeriodCalculations,
} from "../lib/payroll-engine/compare-service";
import { listValidations } from "../lib/payroll-engine/validation-center";
import {
  getEmployeePayrollAudit,
  getPeriodPayrollSummary,
} from "../lib/payroll-engine/audit-trail-service";
import {
  verifyProjectionReadiness,
  verifyAndProject,
} from "../lib/payroll-engine/projection-verify";
import {
  submitPayrollForApproval,
  actOnApprovalStep,
} from "../lib/payroll/actions";
import { lockPayrollPeriod } from "../lib/payroll/lock";

const prisma = new PrismaClient();
const scope = {
  userId: "",
  role: "SUPER_ADMIN" as const,
  organizationId: null as string | null,
  companyId: null as string | null,
};

async function main() {
  const user = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!user) throw new Error("No SUPER_ADMIN");
  scope.userId = user.id;
  const actor = { id: user.id, name: user.name, role: "SUPER_ADMIN" as const };

  const group = await prisma.payrollGroup.findFirst({
    where: { status: "ACTIVE", assignments: { some: { status: "ACTIVE" } } },
  });
  if (!group) throw new Error("No group");

  // Tax + BPJS versions
  const tax = await createTaxConfigVersion(scope, {
    companyId: group.companyId,
    name: "E2E Tax 1.5",
    defaultTerRate: 0.05,
    effectiveFrom: "2026-01-01",
    changeNote: "e2e 1.5",
    activate: true,
  });
  const bpjs = await createBpjsConfigVersion(scope, {
    companyId: group.companyId,
    name: "E2E BPJS 1.5",
    effectiveFrom: "2026-01-01",
    kesehatanEmployee: 0.01,
    kesehatanEmployer: 0.04,
    jhtEmployee: 0.02,
    jhtEmployer: 0.037,
    jkkEmployer: 0.0024,
    jkmEmployer: 0.003,
    jpEmployee: 0.01,
    jpEmployer: 0.02,
    maxWageKesehatan: 12_000_000,
    maxWageJp: 10_547_400,
    changeNote: "e2e",
    activate: true,
  });
  console.log("tax", tax.version, "bpjs", bpjs.version);

  // Formula version
  await createFormulaVersion({
    companyId: group.companyId,
    code: "E2E_TEST_COMP",
    name: "E2E Component",
    expression: "BaseSalary * 0",
    activate: true,
    changeNote: "e2e formula",
    createdById: user.id,
  });

  const stamp = Date.now();
  const day = 1 + (stamp % 28);
  const d = `2027-05-${String(day).padStart(2, "0")}`;
  const { period } = await createPayrollPeriodFromGroup(
    {
      payrollGroupId: group.id,
      name: `E2E 1.5 ${stamp}`,
      periodStart: d,
      periodEnd: d,
      paymentDueAt: d,
    },
    actor,
    { allowDateOverride: true },
  );
  console.log("period", period.id);

  await materializePayrollLines(scope, period.id);

  // Run 1
  const run1 = await runPeriodPayrollCalculation(scope, period.id, {
    runReason: "Baseline run",
  });
  console.log("run1", run1.calculationId, run1.runNumber, run1.status);

  // Run 2 (revision)
  const run2 = await runPeriodPayrollCalculation(scope, period.id, {
    runReason: "Second run after OT review",
  });
  console.log("run2", run2.calculationId, run2.runNumber);

  const runs = await listPeriodCalculations(period.id);
  if (runs.length < 2) throw new Error("Expected 2+ runs");

  const cmp = await compareCalculations(run1.calculationId, run2.calculationId);
  console.log("compare changedEmployees", cmp.totals.changedEmployees);

  const vals = await listValidations({
    calculationId: run2.calculationId,
  });
  console.log("validations", vals.length);

  await submitPayrollForApproval(scope, period.id);
  const steps = await prisma.approvalStep.findMany({
    where: { payrollPeriodId: period.id, status: "PENDING" },
  });
  for (const s of steps) {
    await actOnApprovalStep(scope, s.id, "APPROVED", "e2e");
  }

  const verify = await verifyProjectionReadiness(
    scope,
    period.id,
    run2.calculationId,
  );
  console.log(
    "verify",
    verify.ok,
    verify.checks.filter((c) => !c.ok).map((c) => c.code),
  );
  if (!verify.ok) throw new Error("Projection verify failed");

  const proj = await verifyAndProject(scope, period.id, run2.calculationId);
  if (!proj.projected) throw new Error("Project failed");
  console.log("projected", proj.result?.employeeCount);

  // Re-project idempotent before lock
  const proj2 = await verifyAndProject(scope, period.id, run2.calculationId);
  if (!proj2.projected) throw new Error("Re-project failed");
  console.log("re-project ok");

  const line = await prisma.payrollLine.findFirst({
    where: { payrollPeriodId: period.id },
  });
  if (!line) throw new Error("No line");
  const audit = await getEmployeePayrollAudit({
    payrollPeriodId: period.id,
    employeeId: line.employeeId,
    calculationId: run2.calculationId,
  });
  console.log(
    "audit chain keys",
    Object.keys(audit.chain),
    "net",
    audit.chain.payrollLine?.netPay,
  );

  const summary = await getPeriodPayrollSummary(period.id);
  console.log("summary", {
    net: summary.totals.netPayroll,
    employees: summary.totals.totalEmployees,
    runs: summary.revision.runCount,
    validation: summary.validation.status,
  });

  await lockPayrollPeriod(scope, period.id);
  console.log("locked");

  console.log(
    JSON.stringify(
      {
        ok: true,
        periodId: period.id,
        run1: run1.calculationId,
        run2: run2.calculationId,
        taxVersion: tax.version,
        bpjsVersion: bpjs.version,
        summaryNet: summary.totals.netPayroll,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("E2E_1_5_FAIL", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
