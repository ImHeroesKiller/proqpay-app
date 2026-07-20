import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import type { AlertItem, KpiCard, Role } from "@/types";
import {
  mapApprovalStep,
  mapAuditLog,
  mapCapitalAllocation,
  mapCapitalPartner,
  mapClientCompany,
  mapCompanySettings,
  mapDisbursement,
  mapEmployee,
  mapPaymentInstruction,
  mapPayrollLine,
  mapPayrollPeriod,
  mapPricingRule,
  mapSalesOpportunity,
  mapUser,
  mapWorkingCapital,
} from "@/lib/data/mappers";
import {
  canViewExecutiveDashboard,
  canViewSalesPipeline,
  canViewWorkingCapitalLimits,
} from "@/lib/auth/permissions";
import type { SessionScope } from "@/lib/auth/scope";
import { companyWhere } from "@/lib/auth/scope";

export async function getUsers() {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapUser);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function getEmployees(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};
  const rows = await prisma.employee.findMany({
    where,
    orderBy: { employeeCode: "asc" },
  });
  return rows.map(mapEmployee);
}

export async function getEmployeeById(id: string, scope?: SessionScope) {
  const row = await prisma.employee.findUnique({ where: { id } });
  if (!row) return null;
  if (scope && companyWhere(scope).companyId && row.companyId !== companyWhere(scope).companyId) {
    return null;
  }
  return mapEmployee(row);
}

export async function getPayrollPeriods(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};
  const rows = await prisma.payrollPeriod.findMany({
    where,
    include: { sourceBankAccount: true },
    orderBy: { periodStart: "desc" },
  });
  return rows.map((r) => mapPayrollPeriod(r, r.sourceBankAccount));
}

export async function getPayrollPeriodById(id: string, scope?: SessionScope) {
  const row = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { sourceBankAccount: true },
  });
  if (!row) return null;
  if (scope?.companyId && scope.role !== "SUPER_ADMIN" && row.companyId !== scope.companyId) {
    return null;
  }
  return mapPayrollPeriod(row, row.sourceBankAccount);
}

export async function getPayrollLines(periodId: string) {
  const rows = await prisma.payrollLine.findMany({
    where: { payrollPeriodId: periodId },
    orderBy: { employeeName: "asc" },
  });
  return rows.map(mapPayrollLine);
}

export async function getApprovalSteps(periodId?: string) {
  const rows = await prisma.approvalStep.findMany({
    where: periodId ? { payrollPeriodId: periodId } : undefined,
    orderBy: [{ payrollPeriodId: "asc" }, { level: "asc" }],
  });
  return rows.map(mapApprovalStep);
}

export async function getDisbursements(scope?: SessionScope) {
  const periods = await getPayrollPeriods(scope);
  const ids = periods.map((p) => p.id);
  const rows = await prisma.disbursementBatch.findMany({
    where: ids.length ? { payrollPeriodId: { in: ids } } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDisbursement);
}

export async function getWorkingCapitalRequests(scope?: SessionScope) {
  const where = scope?.companyId && scope.role !== "SUPER_ADMIN"
    ? { companyId: scope.companyId }
    : {};
  const rows = await prisma.workingCapitalRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
  });
  return rows.map(mapWorkingCapital);
}

export async function getPaymentInstructions(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};
  const rows = await prisma.paymentInstruction.findMany({
    where,
    include: { sourceBankAccount: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => mapPaymentInstruction(r, r.sourceBankAccount));
}

export async function getAuditLogs(scope?: SessionScope) {
  const where =
    scope && scope.role !== "SUPER_ADMIN" && scope.companyId
      ? { companyId: scope.companyId }
      : {};
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return rows.map(mapAuditLog);
}

export async function getCompanySettings(scope?: SessionScope) {
  const where =
    scope?.companyId && scope.role !== "SUPER_ADMIN"
      ? { id: scope.companyId }
      : {};
  const company = await prisma.company.findFirst({
    where,
    orderBy: { createdAt: "asc" },
  });
  if (!company) return null;
  const banks = await prisma.bankAccount.findMany({
    where: { companyId: company.id },
    orderBy: { label: "asc" },
  });
  return mapCompanySettings(company, banks);
}

export async function getClients(scope: SessionScope) {
  if (scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR") return [];
  const rows = await prisma.company.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(mapClientCompany);
}

export async function getSalesOpportunities(scope: SessionScope) {
  if (!canViewSalesPipeline(scope.role)) return [];
  const rows = await prisma.salesOpportunity.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapSalesOpportunity);
}

export async function getPricingRules(scope: SessionScope) {
  if (scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR") return [];
  const rows = await prisma.pricingRule.findMany({
    include: { company: true },
    orderBy: { effectiveFrom: "desc" },
  });
  return rows.map(mapPricingRule);
}

export async function getCapitalPartners(scope: SessionScope) {
  if (
    scope.role !== "SUPER_ADMIN" &&
    scope.role !== "DIRECTOR" &&
    scope.role !== "FINANCE"
  ) {
    return [];
  }
  const rows = await prisma.capitalPartner.findMany({
    orderBy: { displayName: "asc" },
  });
  return rows.map(mapCapitalPartner);
}

export async function getCapitalAllocations(scope: SessionScope) {
  if (
    scope.role !== "SUPER_ADMIN" &&
    scope.role !== "DIRECTOR" &&
    scope.role !== "FINANCE"
  ) {
    return [];
  }
  const rows = await prisma.capitalAllocation.findMany({
    include: {
      capitalPartner: true,
      workingCapitalRequest: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapCapitalAllocation);
}

export async function getDashboardKpis(
  role: Role,
  scope?: SessionScope,
): Promise<KpiCard[]> {
  const where = scope ? companyWhere(scope) : {};
  const [employees, periods, pendingApprovals, selfFunded, wcFunded] =
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
        where: { ...where, fundingModel: "SELF_FUNDED" },
      }),
      prisma.payrollPeriod.count({
        where: { ...where, fundingModel: "WORKING_CAPITAL" },
      }),
    ]);

  const current =
    periods.find((p) => p.status === "WAITING" || p.status === "APPROVED") ??
    periods[0];
  const probation = await prisma.employee.count({
    where: { ...where, status: "PROBATION" },
  });

  const ops: KpiCard[] = [
    {
      label: "Payroll this period",
      value: current ? formatRupiah(Number(current.totalNet)) : formatRupiah(0),
      change: current
        ? `${current.name} · ${current.fundingModel === "SELF_FUNDED" ? "Client-funded" : "Working capital"}`
        : "No period",
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Active employees",
      value: String(employees),
      change: probation ? `${probation} on probation` : "All active",
      trend: "neutral",
      href: "/employees",
    },
    {
      label: "Pending approvals",
      value: String(pendingApprovals),
      change: pendingApprovals ? "Open steps" : "Clear",
      trend: pendingApprovals ? "down" : "neutral",
      href: "/approval",
    },
    {
      label: "Funding mix",
      value: `${selfFunded} / ${wcFunded}`,
      change: "Client-funded / Working capital periods",
      trend: "neutral",
      href: "/payroll",
    },
  ];

  if (canViewExecutiveDashboard(role)) {
    const managed = periods.reduce((s, p) => s + Number(p.totalNet), 0);
    const clients = await prisma.company.count({
      where: { lifecycleStatus: "ACTIVE" },
    });
    ops.push({
      label: "Managed payroll (recent)",
      value: formatRupiah(managed),
      change: `${clients} active clients`,
      trend: "up",
      href: "/clients",
    });

    if (canViewSalesPipeline(role)) {
      const pipeline = await prisma.salesOpportunity.aggregate({
        where: { status: "OPEN" },
        _sum: { weightedPipelineValue: true, estimatedPayrollValue: true },
      });
      ops.push({
        label: "Weighted pipeline",
        value: formatRupiah(Number(pipeline._sum.weightedPipelineValue ?? 0)),
        change: `Gross est. ${formatRupiah(Number(pipeline._sum.estimatedPayrollValue ?? 0))}`,
        trend: "up",
        href: "/sales",
      });
    }

    if (canViewWorkingCapitalLimits(role)) {
      const exposure = await prisma.workingCapitalRequest.aggregate({
        where: {
          status: { in: ["APPROVED", "FUNDED", "OUTSTANDING", "SETTLEMENT_DUE"] },
        },
        _sum: { approvedAmount: true },
      });
      ops.push({
        label: "WC exposure",
        value: formatRupiah(Number(exposure._sum.approvedAmount ?? 0)),
        change: "Approved / outstanding funding",
        trend: "down",
        href: "/working-capital",
      });
    }
  }

  return ops;
}

export async function getDashboardAlerts(
  scope?: SessionScope,
): Promise<AlertItem[]> {
  const where = scope ? companyWhere(scope) : {};
  const pending = await prisma.approvalStep.count({
    where: { status: "PENDING" },
  });
  const waiting = await prisma.payrollPeriod.findFirst({
    where: { ...where, status: "WAITING" },
    orderBy: { periodStart: "desc" },
  });
  const piReady = await prisma.paymentInstruction.count({
    where: {
      ...(scope?.companyId && scope.role !== "SUPER_ADMIN"
        ? { companyId: scope.companyId }
        : {}),
      executionStatus: { in: ["DRAFT", "READY"] },
    },
  });
  const failedItems = await prisma.paymentInstructionItem.count({
    where: { status: "FAILED" },
  });

  const alerts: AlertItem[] = [];
  if (waiting && pending > 0) {
    alerts.push({
      id: "al_approval",
      type: "warning",
      title: "Approval pending",
      description: `${waiting.name} has ${pending} open approval step(s). Funding model: ${waiting.fundingModel === "SELF_FUNDED" ? "client-funded" : "working capital"}.`,
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
  return alerts;
}

export async function getPayrollChartData(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};
  const periods = await prisma.payrollPeriod.findMany({
    where: { ...where, totalNet: { gt: 0 } },
    orderBy: { periodStart: "asc" },
    take: 6,
  });
  return periods.map((p) => ({
    month: p.name.split(" ")[0]?.slice(0, 3) ?? p.name,
    amount: Number(p.totalNet) / 1_000_000,
    fundingModel: p.fundingModel,
  }));
}
