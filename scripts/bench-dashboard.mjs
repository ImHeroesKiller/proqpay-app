/**
 * Local dashboard data-layer micro-benchmark.
 * Does NOT log secrets or payroll amounts.
 *
 * Usage:
 *   PERFORMANCE_LOGGING=true node --import tsx scripts/bench-dashboard.mjs
 *   (or) pnpm exec tsx scripts/bench-dashboard.mjs
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (no dependency)
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
console.log("[bench] db host:", host);

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

function companyWhere(role, companyId) {
  if (role === "SUPER_ADMIN") return {};
  if (companyId) return { companyId };
  return { companyId: "00000000-0000-0000-0000-000000000000" };
}

/** Legacy sequential-wave pattern (mirrors pre-fix getDashboardKpis + alerts + periods + chart). */
async function legacyDashboard(scope) {
  const where = companyWhere(scope.role, scope.companyId);
  const companyFilter = where.companyId ? { companyId: where.companyId } : {};
  const t0 = performance.now();
  let queries = 0;

  // Wave 1
  await Promise.all([
    prisma.employee.count({
      where: { ...where, status: { in: ["ACTIVE", "PROBATION"] } },
    }),
    prisma.payrollPeriod.findMany({
      where,
      orderBy: { periodStart: "desc" },
      take: 6,
    }),
    prisma.approvalStep.count({ where: { status: "PENDING" } }),
    prisma.payrollPeriod.count({
      where: { ...companyFilter, status: "WAITING_CLIENT_TRANSFER" },
    }),
    prisma.paymentConfirmation.count({
      where: {
        ...companyFilter,
        status: { in: ["UPLOADED", "UNDER_REVIEW"] },
      },
    }),
    prisma.paymentConfirmation.count({
      where: { ...companyFilter, status: "REJECTED" },
    }),
    prisma.paymentConfirmation.count({
      where: {
        ...companyFilter,
        status: "VERIFIED",
        verifiedAt: { gte: new Date(new Date().toISOString().slice(0, 10)) },
      },
    }),
  ]);
  queries += 7;

  // Sequential waves (legacy)
  await prisma.employee.count({
    where: { ...where, status: "PROBATION" },
  });
  queries += 1;

  await prisma.payrollPeriod.count({
    where: { ...companyFilter, status: "CLOSED" },
  });
  queries += 1;
  await prisma.payrollPeriod.count({
    where: {
      ...companyFilter,
      status: {
        in: [
          "PAYMENT_INSTRUCTION_GENERATED",
          "WAITING_CLIENT_TRANSFER",
          "TRANSFER_PROOF_UPLOADED",
          "UNDER_VERIFICATION",
        ],
      },
    },
  });
  queries += 1;
  await prisma.workingCapitalRequest.count({
    where: {
      ...companyFilter,
      settlementStatus: { in: ["PENDING", "PARTIAL"] },
    },
  });
  queries += 1;
  await prisma.workingCapitalRequest.aggregate({
    where: {
      status: {
        in: ["APPROVED", "FUNDED", "OUTSTANDING", "SETTLEMENT_DUE"],
      },
    },
    _sum: { approvedAmount: true },
  });
  queries += 1;
  await prisma.salesOpportunity.aggregate({
    where: { status: "OPEN" },
    _sum: { weightedPipelineValue: true },
  });
  queries += 1;

  // Alerts sequential
  await prisma.approvalStep.count({ where: { status: "PENDING" } });
  queries += 1;
  await prisma.payrollPeriod.findFirst({
    where: { ...where, status: "WAITING" },
    orderBy: { periodStart: "desc" },
  });
  queries += 1;
  await prisma.paymentInstruction.count({
    where: { executionStatus: { in: ["DRAFT", "READY"] } },
  });
  queries += 1;
  await prisma.paymentInstructionItem.count({ where: { status: "FAILED" } });
  queries += 1;

  // Full periods + bank join
  await prisma.payrollPeriod.findMany({
    where,
    include: { sourceBankAccount: true },
    orderBy: { periodStart: "desc" },
  });
  queries += 1;

  // Chart
  await prisma.payrollPeriod.findMany({
    where: { ...where, totalNet: { gt: 0 } },
    orderBy: { periodStart: "asc" },
    take: 6,
  });
  queries += 1;

  return { durationMs: Math.round(performance.now() - t0), queries };
}

/** Optimized single-batch pattern (matches lib/data/dashboard.ts). */
async function optimizedDashboard(scope) {
  const where = companyWhere(scope.role, scope.companyId);
  const companyFilter = where.companyId ? { companyId: where.companyId } : {};
  const t0 = performance.now();
  let queries = 0;

  await Promise.all([
    prisma.employee.groupBy({
      by: ["status"],
      where: { ...where, status: { in: ["ACTIVE", "PROBATION"] } },
      _count: { _all: true },
    }),
    prisma.payrollPeriod.groupBy({
      by: ["status"],
      where: companyFilter,
      _count: { _all: true },
    }),
    prisma.payrollPeriod.findMany({
      where: companyFilter,
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
      where: companyFilter,
      _count: { _all: true },
    }),
    prisma.paymentConfirmation.count({
      where: {
        ...companyFilter,
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
      where: {
        ...companyFilter,
        settlementStatus: { in: ["PENDING", "PARTIAL"] },
      },
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
      where: { ...companyFilter, totalNet: { gt: 0 } },
      orderBy: { periodStart: "asc" },
      take: 6,
      select: { name: true, totalNet: true, fundingModel: true },
    }),
  ]);
  queries += 12;

  return { durationMs: Math.round(performance.now() - t0), queries };
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const scope = { role: "SUPER_ADMIN", companyId: null };

// Warm connection
await prisma.$queryRaw`SELECT 1`;

const legacyRuns = [];
const optRuns = [];

for (let i = 0; i < 3; i++) {
  legacyRuns.push(await legacyDashboard(scope));
  optRuns.push(await optimizedDashboard(scope));
}

console.log("[bench] legacy runs (ms):", legacyRuns.map((r) => r.durationMs));
console.log("[bench] optimized runs (ms):", optRuns.map((r) => r.durationMs));
console.log("[bench] legacy median ms:", median(legacyRuns.map((r) => r.durationMs)));
console.log("[bench] optimized median ms:", median(optRuns.map((r) => r.durationMs)));
console.log("[bench] legacy queries:", legacyRuns[0].queries);
console.log("[bench] optimized queries:", optRuns[0].queries);
console.log(
  "[bench] improvement %:",
  Math.round(
    (1 -
      median(optRuns.map((r) => r.durationMs)) /
        median(legacyRuns.map((r) => r.durationMs))) *
      100,
  ),
);

await prisma.$disconnect();
