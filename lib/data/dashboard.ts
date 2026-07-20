/**
 * Consolidated Dashboard data-access layer.
 *
 * Design goals:
 * - One parallel query batch (no sequential waves)
 * - DB-side counts/groupBy instead of loading full tables
 * - Minimal select (no bank account joins)
 * - Preserve KPI semantics and tenant scope (companyWhere)
 * - No shared cross-tenant cache of payroll data
 */

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import type { AlertItem, KpiCard, Role } from "@/types";
import {
  canViewExecutiveDashboard,
  canViewSalesPipeline,
  canViewWorkingCapitalLimits,
} from "@/lib/auth/permissions";
import type { SessionScope } from "@/lib/auth/scope";
import { companyWhere } from "@/lib/auth/scope";
import { measure, perfLog, createQueryCounter } from "@/lib/perf";

export type DashboardPipelineCounts = {
  draft: number;
  waiting: number;
  instruction: number;
  transfer: number;
  proof: number;
  closed: number;
};

export type DashboardActivePeriod = {
  id: string;
  name: string;
  status: string;
  fundingModel: "SELF_FUNDED" | "WORKING_CAPITAL";
  employeeCount: number;
  payDate: string;
  totalNet: number;
};

export type DashboardChartPoint = {
  month: string;
  amount: number;
  fundingModel: string;
};

export type DashboardBundle = {
  kpis: KpiCard[];
  alerts: AlertItem[];
  pipeline: DashboardPipelineCounts;
  active: DashboardActivePeriod | null;
  chartData: DashboardChartPoint[];
  meta: {
    queryCount: number;
    durationMs: number;
  };
};

const ACTIVE_CYCLE_STATUSES = [
  "WAITING",
  "APPROVED",
  "PAYMENT_INSTRUCTION_GENERATED",
  "WAITING_CLIENT_TRANSFER",
  "TRANSFER_PROOF_UPLOADED",
  "UNDER_VERIFICATION",
] as const;

const PENDING_CONFIRMATION_STATUSES = [
  "PAYMENT_INSTRUCTION_GENERATED",
  "WAITING_CLIENT_TRANSFER",
  "TRANSFER_PROOF_UPLOADED",
  "UNDER_VERIFICATION",
] as const;

/**
 * Operational payroll scope:
 * - Tenant-bound users: their companyId only
 * - Org-wide roles: EXISTING active clients only (exclude INTERNAL + PROSPECT)
 */
function operationalPayrollWhere(scope: SessionScope): Prisma.PayrollPeriodWhereInput {
  const where = companyWhere(scope);
  if (where.companyId) {
    return { companyId: where.companyId };
  }
  return {
    company: {
      clientType: "EXISTING",
      lifecycleStatus: "ACTIVE",
    },
  };
}

function operationalCompanyFilter(
  scope: SessionScope,
): Prisma.PaymentConfirmationWhereInput {
  const where = companyWhere(scope);
  if (where.companyId) {
    return { companyId: where.companyId };
  }
  return {
    company: {
      clientType: "EXISTING",
      lifecycleStatus: "ACTIVE",
    },
  };
}

function startOfUtcDay(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

function formatDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function emptyPipeline(): DashboardPipelineCounts {
  return {
    draft: 0,
    waiting: 0,
    instruction: 0,
    transfer: 0,
    proof: 0,
    closed: 0,
  };
}

function pipelineFromGroupBy(
  rows: { status: string; _count: { _all: number } }[],
): DashboardPipelineCounts {
  const byStatus = new Map(rows.map((r) => [r.status, r._count._all]));
  const get = (s: string) => byStatus.get(s) ?? 0;
  return {
    draft: get("DRAFT"),
    waiting: get("WAITING"),
    instruction: get("PAYMENT_INSTRUCTION_GENERATED") + get("APPROVED"),
    transfer: get("WAITING_CLIENT_TRANSFER"),
    proof: get("TRANSFER_PROOF_UPLOADED") + get("UNDER_VERIFICATION"),
    closed: get("CLOSED") + get("VERIFIED") + get("DISBURSED"),
  };
}

function countStatuses(
  byStatus: Map<string, number>,
  statuses: readonly string[],
): number {
  return statuses.reduce((sum, s) => sum + (byStatus.get(s) ?? 0), 0);
}

/**
 * Cached per-request by scope identity fields (React cache).
 * Safe: key includes userId + role + companyId so tenant/role cannot collide.
 */
export const loadDashboardBundle = cache(
  async (
    userId: string,
    role: Role,
    companyId: string | null | undefined,
  ): Promise<DashboardBundle> => {
    const scope: SessionScope = {
      userId,
      role,
      companyId: companyId ?? null,
    };
    return measure(
      "dashboard.bundle.total",
      () => fetchDashboardBundle(scope),
      { route: "/dashboard", operation: "dashboard.bundle" },
    );
  },
);

async function fetchDashboardBundle(
  scope: SessionScope,
): Promise<DashboardBundle> {
  const counter = createQueryCounter();
  const started = performance.now();
  const payrollWhere = operationalPayrollWhere(scope);
  const confWhere = operationalCompanyFilter(scope);
  const bound = companyWhere(scope);
  const employeeWhere: Prisma.EmployeeWhereInput = bound.companyId
    ? { companyId: bound.companyId }
    : {
        company: {
          clientType: "EXISTING",
          lifecycleStatus: "ACTIVE",
        },
      };
  const executive = canViewExecutiveDashboard(scope.role);
  const viewWc = canViewWorkingCapitalLimits(scope.role);
  const viewSales = canViewSalesPipeline(scope.role);

  // Track real DB ops only (not Promise.resolve placeholders)
  let plannedQueries = 8; // base parallel set
  if (executive && viewWc) plannedQueries += 2;
  if (executive && viewSales) plannedQueries += 1;

  // ── Single parallel batch ──
  const [
    employeeByStatus,
    periodByStatus,
    recentPeriods,
    confirmationByStatus,
    verifiedToday,
    pendingApprovals,
    piReady,
    failedItems,
    settlementPending,
    fundingExposure,
    weightedPipeline,
    chartPeriods,
  ] = await measure(
    "dashboard.bundle.parallel_queries",
    () =>
      Promise.all([
        // 1 — employee counts by status
        prisma.employee.groupBy({
          by: ["status"],
          where: {
            ...employeeWhere,
            status: { in: ["ACTIVE", "PROBATION"] },
          },
          _count: { _all: true },
        }),
        // 2 — payroll pipeline + executive period counts (one groupBy)
        prisma.payrollPeriod.groupBy({
          by: ["status"],
          where: payrollWhere,
          _count: { _all: true },
        }),
        // 3 — recent periods: KPI current + active cycle + alert waiting
        prisma.payrollPeriod.findMany({
          where: payrollWhere,
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
        // 4 — confirmation status counts
        prisma.paymentConfirmation.groupBy({
          by: ["status"],
          where: confWhere,
          _count: { _all: true },
        }),
        // 5 — verified today
        prisma.paymentConfirmation.count({
          where: {
            ...confWhere,
            status: "VERIFIED",
            verifiedAt: { gte: startOfUtcDay() },
          },
        }),
        // 6 — pending approvals
        prisma.approvalStep.count({ where: { status: "PENDING" } }),
        // 7 — payment instructions pending (existing clients only when org-wide)
        prisma.paymentInstruction.count({
          where: {
            ...(scope.companyId && scope.role !== "SUPER_ADMIN"
              ? { companyId: scope.companyId }
              : {
                  company: {
                    clientType: "EXISTING",
                    lifecycleStatus: "ACTIVE",
                  },
                }),
            executionStatus: { in: ["DRAFT", "READY"] },
          },
        }),
        // 8 — failed instruction items
        prisma.paymentInstructionItem.count({
          where: { status: "FAILED" },
        }),
        // 9–11 — role-gated finance/commercial
        executive && viewWc
          ? prisma.workingCapitalRequest.count({
              where: {
                ...(scope.companyId && scope.role !== "SUPER_ADMIN"
                  ? { companyId: scope.companyId }
                  : {
                      company: {
                        clientType: "EXISTING",
                        lifecycleStatus: "ACTIVE",
                      },
                    }),
                settlementStatus: { in: ["PENDING", "PARTIAL"] },
              },
            })
          : Promise.resolve(0),
        executive && viewWc
          ? prisma.workingCapitalRequest.aggregate({
              where: {
                status: {
                  in: ["APPROVED", "FUNDED", "OUTSTANDING", "SETTLEMENT_DUE"],
                },
              },
              _sum: { approvedAmount: true },
            })
          : Promise.resolve({ _sum: { approvedAmount: null } }),
        // Prospect pipeline uses estimatedPayrollValue sum (not weighted only)
        executive && viewSales
          ? prisma.salesOpportunity.aggregate({
              where: { status: "OPEN" },
              _sum: {
                estimatedPayrollValue: true,
                weightedPipelineValue: true,
              },
            })
          : Promise.resolve({
              _sum: {
                estimatedPayrollValue: null,
                weightedPipelineValue: null,
              },
            }),
        // 12 — chart points (client payroll only)
        prisma.payrollPeriod.findMany({
          where: { ...payrollWhere, totalNet: { gt: 0 }, status: "CLOSED" },
          orderBy: { periodStart: "asc" },
          take: 6,
          select: {
            name: true,
            totalNet: true,
            fundingModel: true,
          },
        }),
      ]),
    { route: "/dashboard", operation: "dashboard.parallel_batch" },
  );

  // chart is always on → +1
  plannedQueries += 1;
  counter.inc(plannedQueries);

  const transformStart = performance.now();

  const periodStatusMap = new Map(
    periodByStatus.map((r) => [r.status, r._count._all]),
  );
  const pipeline = pipelineFromGroupBy(
    periodByStatus as { status: string; _count: { _all: number } }[],
  );
  const closedCount = periodStatusMap.get("CLOSED") ?? 0;
  const pendingConfirmationCount = countStatuses(
    periodStatusMap,
    PENDING_CONFIRMATION_STATUSES,
  );
  const waitingTransfer = pipeline.transfer;

  const activeEmployees = employeeByStatus
    .filter((r) => r.status === "ACTIVE" || r.status === "PROBATION")
    .reduce((s, r) => s + r._count._all, 0);
  const probation =
    employeeByStatus.find((r) => r.status === "PROBATION")?._count._all ?? 0;

  const confMap = new Map(
    confirmationByStatus.map((r) => [r.status, r._count._all]),
  );
  const waitingVerification =
    (confMap.get("UPLOADED") ?? 0) + (confMap.get("UNDER_REVIEW") ?? 0);
  const rejectedProof = confMap.get("REJECTED") ?? 0;

  // Current period for "Payroll this period" KPI (same rule as before)
  const current =
    recentPeriods.find((p) => p.status === "WAITING" || p.status === "APPROVED") ??
    recentPeriods[0];

  // Active cycle: first operational period, else draft
  const activeRow =
    recentPeriods.find((p) =>
      (ACTIVE_CYCLE_STATUSES as readonly string[]).includes(p.status),
    ) ?? recentPeriods.find((p) => p.status === "DRAFT");

  const active: DashboardActivePeriod | null = activeRow
    ? {
        id: activeRow.id,
        name: activeRow.name,
        status: activeRow.status,
        fundingModel:
          activeRow.fundingModel as DashboardActivePeriod["fundingModel"],
        employeeCount: activeRow.employeeCount,
        payDate: formatDateOnly(activeRow.payDate),
        totalNet: Number(activeRow.totalNet),
      }
    : null;

  const waitingPeriod = recentPeriods.find((p) => p.status === "WAITING");

  const kpis: KpiCard[] = [
    {
      label: "Payroll this period",
      value: current
        ? formatRupiah(Number(current.totalNet))
        : formatRupiah(0),
      change: current
        ? `${current.name} · ${current.fundingModel === "SELF_FUNDED" ? "Self-transfer" : "Working capital"}`
        : "No period",
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Waiting client transfer",
      value: String(waitingTransfer),
      change: "Payment instruction issued; client pays employees",
      trend: waitingTransfer ? "down" : "neutral",
      href: "/payment-confirmation",
    },
    {
      label: "Waiting verification",
      value: String(waitingVerification),
      change: rejectedProof
        ? `${rejectedProof} rejected proof(s)`
        : "Transfer proofs in review",
      trend: waitingVerification ? "down" : "neutral",
      href: "/payment-confirmation",
    },
    {
      label: "Verified today",
      value: String(verifiedToday),
      change: pendingApprovals
        ? `${pendingApprovals} approval step(s) open`
        : "Confirmations verified",
      trend: "up",
      href: "/payment-confirmation",
    },
  ];

  if (executive) {
    kpis.push(
      {
        label: "Payroll closed",
        value: String(closedCount),
        change: `${activeEmployees} active employees · ${probation} probation`,
        trend: "up",
        href: "/payroll",
      },
      {
        label: "Pending confirmation",
        value: String(pendingConfirmationCount),
        change: "Instruction issued → proof → verify",
        trend: pendingConfirmationCount ? "down" : "neutral",
        href: "/payment-confirmation",
      },
    );

    if (viewWc) {
      kpis.push({
        label: "Funding exposure",
        value: formatRupiah(
          Number(fundingExposure._sum.approvedAmount ?? 0),
        ),
        change: `Settlement pending: ${settlementPending}`,
        trend: "down",
        href: "/working-capital",
      });
    }

    if (viewSales) {
      const estimated = Number(
        weightedPipeline._sum.estimatedPayrollValue ?? 0,
      );
      const weighted = Number(
        weightedPipeline._sum.weightedPipelineValue ?? 0,
      );
      kpis.push({
        label: "Prospect pipeline",
        value: formatRupiah(estimated),
        change: `Weighted ${formatRupiah(weighted)} · not processed payroll`,
        trend: "up",
        href: "/sales",
      });
    }
  }

  const alerts: AlertItem[] = [];
  if (waitingPeriod && pendingApprovals > 0) {
    alerts.push({
      id: "al_approval",
      type: "warning",
      title: "Approval pending",
      description: `${waitingPeriod.name} has ${pendingApprovals} open approval step(s). Funding model: ${waitingPeriod.fundingModel === "SELF_FUNDED" ? "client-funded" : "working capital"}.`,
      time: "Live",
    });
  }
  if (piReady > 0) {
    alerts.push({
      id: "al_pi",
      type: "info",
      title: "Payment instructions pending",
      description: `${piReady} instruction(s) await generation or execution (integration: simulated).`,
      time: "Live",
    });
  }
  if (failedItems > 0) {
    alerts.push({
      id: "al_fail",
      type: "danger",
      title: "Failed payment items",
      description: `${failedItems} instruction item(s) marked FAILED — review before reconciliation.`,
      time: "Live",
    });
  }
  alerts.push({
    id: "al_models",
    type: "success",
    title: "Two payroll models",
    description:
      "Client-funded keeps money in the client bank. Working capital is optional and separately approved.",
    time: "Policy",
  });

  const chartData: DashboardChartPoint[] = chartPeriods.map((p) => ({
    month: p.name.split(" ")[0]?.slice(0, 3) ?? p.name,
    amount: Number(p.totalNet) / 1_000_000,
    fundingModel: p.fundingModel,
  }));

  const transformMs = Math.round(performance.now() - transformStart);
  const durationMs = Math.round(performance.now() - started);

  perfLog("dashboard.bundle.transform", {
    route: "/dashboard",
    operation: "dashboard.transform",
    durationMs: transformMs,
    queryCount: counter.get(),
    recordCount: recentPeriods.length + chartPeriods.length,
  });

  return {
    kpis,
    alerts,
    pipeline:
      periodByStatus.length === 0 ? emptyPipeline() : pipeline,
    active,
    chartData,
    meta: {
      queryCount: counter.get(),
      durationMs,
    },
  };
}
