/**
 * Integration E2E Increment 1 (service-level against live DB).
 * Run: pnpm exec tsx scripts/e2e-increment1.ts
 */
import { PrismaClient } from "@prisma/client";
import { materializePayrollLines } from "../lib/payroll/population";
import { importAttendanceCsv } from "../lib/attendance/import-service";
import { runPeriodPayrollCalculation } from "../lib/payroll/period-run";
import { projectCalculationToPayrollLines } from "../lib/payroll-engine/project-to-lines";
import { lockPayrollPeriod } from "../lib/payroll/lock";
import {
  generatePaymentInstruction,
  submitPayrollForApproval,
  actOnApprovalStep,
} from "../lib/payroll/actions";
import { createPayrollPeriodFromGroup } from "../lib/master-data/service";

const prisma = new PrismaClient();

const scope = {
  userId: "00000000-0000-0000-0000-000000000001",
  role: "SUPER_ADMIN" as const,
  organizationId: null as string | null,
  companyId: null as string | null,
};

async function ensureUser() {
  const u = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!u) throw new Error("No SUPER_ADMIN user");
  (scope as { userId: string }).userId = u.id;
  return u;
}

async function ensureStatutory(companyId: string) {
  if (
    !(await prisma.taxConfig.findFirst({
      where: { companyId, isActive: true },
    }))
  ) {
    await prisma.taxConfig.create({
      data: {
        companyId,
        name: "E2E TER",
        method: "TER",
        defaultTerRate: 0.05,
        nonNpwpSurcharge: 0.2,
        isActive: true,
        effectiveFrom: new Date("2026-01-01"),
      },
    });
  }
  if (
    !(await prisma.bpjsConfig.findFirst({
      where: { companyId, isActive: true },
    }))
  ) {
    await prisma.bpjsConfig.create({
      data: {
        companyId,
        name: "E2E BPJS",
        isActive: true,
        effectiveFrom: new Date("2026-01-01"),
      },
    });
  }
}

async function main() {
  const user = await ensureUser();
  const actor = {
    id: user.id,
    name: user.name,
    role: user.role as typeof scope.role,
  };

  const group = await prisma.payrollGroup.findFirst({
    where: {
      status: "ACTIVE",
      assignments: { some: { status: "ACTIVE" } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!group) throw new Error("No payroll group with assignments");

  await ensureStatutory(group.companyId);

  // Unique non-overlapping window (far future day range)
  const stamp = Date.now();
  const day = 10 + (stamp % 15);
  const periodStart = `2027-03-${String(day).padStart(2, "0")}`;
  const periodEnd = `2027-03-${String(day).padStart(2, "0")}`;
  // single-day period to reduce collision
  const created = await createPayrollPeriodFromGroup(
    {
      payrollGroupId: group.id,
      name: `E2E Inc1 ${stamp}`,
      periodStart,
      periodEnd,
      paymentDueAt: periodEnd,
      allowEmptyPopulation: false,
    },
    actor,
    { allowDateOverride: true },
  );

  let period = created.period;
  console.log("period", period.id, period.name, period.status);

  const pop = await materializePayrollLines(scope, period.id);
  console.log("population", pop);

  const emps = await prisma.payrollLine.findMany({
    where: { payrollPeriodId: period.id },
    include: { employee: true },
    take: 3,
  });
  if (!emps.length) throw new Error("No lines after population");

  const start = period.periodStart.toISOString().slice(0, 10);
  const csv = [
    "employee_code,work_date,type,hours_worked,overtime_hours",
    ...emps.map(
      (l, i) =>
        `${l.employee.employeeCode},${start},PRESENT,8,${i === 0 ? 2 : 0}`,
    ),
    `NO-SUCH-EMP,${start},PRESENT,8,0`,
  ].join("\n");

  const imp = await importAttendanceCsv(scope, {
    companyId: group.companyId,
    payrollPeriodId: period.id,
    fileName: `e2e-${stamp}.csv`,
    csvText: csv,
    autoCommit: true,
  });
  console.log("import", {
    success: imp.batch?.successRows,
    exceptions: imp.batch?.exceptionRows,
    status: imp.batch?.status,
  });

  const open = await prisma.attendanceImportException.findMany({
    where: { status: "OPEN", batch: { payrollPeriodId: period.id } },
  });
  for (const ex of open) {
    await prisma.attendanceImportException.update({
      where: { id: ex.id },
      data: {
        status: "IGNORED",
        resolvedAt: new Date(),
        resolutionNote: "E2E ignore",
      },
    });
  }

  const imp2 = await importAttendanceCsv(scope, {
    companyId: group.companyId,
    payrollPeriodId: period.id,
    fileName: `e2e-re-${stamp}.csv`,
    csvText: csv,
    autoCommit: true,
  });
  console.log("re-import idempotent", imp2.idempotent === true);

  const calc = await runPeriodPayrollCalculation(scope, period.id, {
    projectImmediately: false,
  });
  console.log("calc", calc.calculationId, calc.status);
  if (calc.status === "FAILED") throw new Error("Calculation failed");

  await submitPayrollForApproval(scope, period.id);
  const steps = await prisma.approvalStep.findMany({
    where: { payrollPeriodId: period.id, status: "PENDING" },
    orderBy: { level: "asc" },
  });
  for (const step of steps) {
    await actOnApprovalStep(scope, step.id, "APPROVED", "E2E");
  }
  period = (await prisma.payrollPeriod.findUnique({
    where: { id: period.id },
  }))!;
  if (period.status !== "APPROVED") {
    throw new Error(`Expected APPROVED got ${period.status}`);
  }

  const projection = await projectCalculationToPayrollLines(
    scope,
    period.id,
    calc.calculationId,
    { requireApprovedPeriod: true },
  );
  console.log("projection", projection.employeeCount, projection.totalNet);

  const locked = await lockPayrollPeriod(scope, period.id);
  console.log("lock", locked);

  // I2-A: create DRAFT then SUPER_ADMIN self-approve with mandatory comment
  const piId = await generatePaymentInstruction(scope, period.id);
  const { approveInstruction } = await import("../lib/payout/instruction-service");
  const { submitInstruction } = await import("../lib/payout/instruction-service");
  await submitInstruction(scope, piId);
  await approveInstruction(scope, piId, {
    comment: "E2E SUPER_ADMIN override after I2-A SoD",
  });
  const pi = await prisma.paymentInstruction.findUnique({
    where: { id: piId },
    include: { items: true },
  });
  console.log("PI", piId, "items", pi?.items.length, pi?.executionStatus);

  let blocked = false;
  try {
    await runPeriodPayrollCalculation(scope, period.id);
  } catch (e) {
    blocked = e instanceof Error && /locked/i.test(e.message);
  }
  if (!blocked) throw new Error("Locked period should block calc");

  console.log(
    JSON.stringify(
      {
        ok: true,
        periodId: period.id,
        calculationId: calc.calculationId,
        piId,
        itemCount: pi?.items.length,
        totalNet: String(pi?.totalAmount),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("E2E_FAIL", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
