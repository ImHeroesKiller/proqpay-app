/**
 * Multi-route data-layer micro-benchmark (new dataset).
 * Does NOT log secrets or payroll amounts.
 *
 * Usage: pnpm exec tsx scripts/bench-routes.mjs
 * Requires DATABASE_URL (e.g. from .env.local).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — cannot benchmark");
  process.exit(1);
}

const host =
  (process.env.DATABASE_URL.match(/@([^:/?]+)/) || [])[1] || "unknown";
console.log("[bench-routes] db host:", host);

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function time(fn, runs = 3) {
  const durations = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    durations.push(Math.round(performance.now() - t0));
  }
  return { runs: durations, median: median(durations) };
}

// Warm
const rtts = [];
for (let i = 0; i < 5; i++) {
  const t0 = performance.now();
  await prisma.$queryRaw`SELECT 1`;
  rtts.push(Math.round(performance.now() - t0));
}
console.log("[bench-routes] SELECT 1 RTT ms:", rtts, "median", median(rtts));

const routes = {
  "/employees": () =>
    prisma.employee.findMany({ orderBy: { employeeCode: "asc" } }),
  "/payroll (no bank)": () =>
    prisma.payrollPeriod.findMany({ orderBy: { periodStart: "desc" } }),
  "/payroll (legacy +bank)": () =>
    prisma.payrollPeriod.findMany({
      include: { sourceBankAccount: true },
      orderBy: { periodStart: "desc" },
    }),
  "/disbursement (direct)": () =>
    prisma.disbursementBatch.findMany({ orderBy: { createdAt: "desc" } }),
  "/disbursement (legacy 2-step)": async () => {
    const periods = await prisma.payrollPeriod.findMany({ select: { id: true } });
    await prisma.disbursementBatch.findMany({
      where: { payrollPeriodId: { in: periods.map((p) => p.id) } },
      orderBy: { createdAt: "desc" },
    });
  },
  "/payment-instructions": () =>
    prisma.paymentInstruction.findMany({
      include: {
        sourceBankAccount: {
          select: {
            id: true,
            label: true,
            bank: true,
            account: true,
            maskedAccountNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  "/payment-confirmation list": () =>
    prisma.paymentConfirmation.findMany({
      select: {
        id: true,
        companyId: true,
        confirmationNumber: true,
        paymentAmount: true,
        status: true,
        company: { select: { name: true } },
        payrollPeriod: { select: { name: true } },
        paymentInstruction: {
          select: { instructionNumber: true, executionModel: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  "/audit": () =>
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100 }),
  "/sales": () =>
    prisma.salesOpportunity.findMany({ orderBy: { updatedAt: "desc" } }),
  "/reports dept groupBy": () =>
    prisma.employee.groupBy({
      by: ["department"],
      _sum: { baseSalary: true },
      _count: { _all: true },
    }),
  "/dashboard optimized batch×12": async () => {
    await Promise.all([
      prisma.employee.groupBy({
        by: ["status"],
        where: { status: { in: ["ACTIVE", "PROBATION"] } },
        _count: { _all: true },
      }),
      prisma.payrollPeriod.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.payrollPeriod.findMany({
        orderBy: { periodStart: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          status: true,
          fundingModel: true,
          totalNet: true,
          periodStart: true,
          payDate: true,
          employeeCount: true,
        },
      }),
      prisma.paymentConfirmation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.paymentConfirmation.count({
        where: {
          status: "VERIFIED",
          verifiedAt: {
            gte: new Date(new Date().toISOString().slice(0, 10)),
          },
        },
      }),
      prisma.approvalStep.count({ where: { status: "PENDING" } }),
      prisma.paymentInstruction.count({
        where: { executionStatus: { in: ["DRAFT", "READY"] } },
      }),
      prisma.paymentInstructionItem.count({ where: { status: "FAILED" } }),
      prisma.workingCapitalRequest.count({
        where: { settlementStatus: { in: ["PENDING", "PARTIAL"] } },
      }),
      prisma.workingCapitalRequest.aggregate({
        where: {
          status: {
            in: ["APPROVED", "FUNDED", "OUTSTANDING", "SETTLEMENT_DUE"],
          },
        },
        _sum: { approvedAmount: true },
      }),
      prisma.salesOpportunity.aggregate({
        where: { status: "OPEN" },
        _sum: { weightedPipelineValue: true },
      }),
      prisma.payrollPeriod.findMany({
        where: { totalNet: { gt: 0 } },
        orderBy: { periodStart: "asc" },
        take: 6,
        select: { name: true, totalNet: true, fundingModel: true },
      }),
    ]);
  },
};

const results = {};
for (const [name, fn] of Object.entries(routes)) {
  results[name] = await time(fn, 3);
  console.log(
    `[bench-routes] ${name}: median ${results[name].median} ms`,
    results[name].runs,
  );
}

console.log(
  JSON.stringify(
    {
      host,
      rttMedian: median(rtts),
      routes: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, v.median]),
      ),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
