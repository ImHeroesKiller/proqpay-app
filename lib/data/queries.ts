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
import {
  formatPayrollGroupLabel,
  getActivePayrollAssignment,
  prismaActiveAssignmentArgs,
} from "@/lib/employees/payroll-assignment";

export async function getUsers(scope?: SessionScope) {
  const rows = await prisma.user.findMany({
    where: scope?.organizationId ? { organizationId: scope.organizationId } : {},
    orderBy: { name: "asc" },
  });
  return rows.map(mapUser);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function getEmployees(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};
  const assignmentArgs = prismaActiveAssignmentArgs();
  const rows = await prisma.employee.findMany({
    where,
    orderBy: { employeeCode: "asc" },
    include: {
      company: { select: { name: true } },
      projectAssignments: {
        where: { isActive: true },
        take: 1,
        include: { project: { select: { name: true, code: true } } },
      },
      payrollAssignments: assignmentArgs,
    },
  });
  return rows.map((row) => {
    const base = mapEmployee(row);
    const activePg = getActivePayrollAssignment(row.payrollAssignments);
    const issues: string[] = [];
    if (!row.bankAccount || row.bankAccount === "-") issues.push("Bank");
    if (!row.npwp || row.npwp === "-") issues.push("NPWP");
    if (!row.bpjsNumber || row.bpjsNumber === "-") issues.push("BPJS");
    if (!activePg?.payrollGroup) issues.push("Payroll group");
    return {
      ...base,
      clientName: row.company?.name,
      projectName: row.projectAssignments[0]
        ? `${row.projectAssignments[0].project.code} · ${row.projectAssignments[0].project.name}`
        : activePg?.project
          ? `${activePg.project.code} · ${activePg.project.name}`
          : undefined,
      payrollGroupName: formatPayrollGroupLabel(activePg),
      bankMasked: row.bankAccount
        ? `****${row.bankAccount.slice(-4)}`
        : "—",
      dataQuality: issues.length ? `Perlu: ${issues.join(", ")}` : "Lengkap",
    };
  });
}

export async function getEmployeeById(id: string, scope?: SessionScope) {
  const row = await prisma.employee.findUnique({
    where: { id },
    include: {
      company: { select: { name: true } },
      payrollAssignments: {
        orderBy: { effectiveFrom: "desc" },
        take: 20,
        include: {
          payrollGroup: { select: { id: true, code: true, name: true } },
          project: { select: { id: true, code: true, name: true } },
        },
      },
      projectAssignments: {
        where: { isActive: true },
        take: 5,
        include: { project: { select: { name: true, code: true } } },
      },
    },
  });
  if (!row) return null;
  if (scope && companyWhere(scope).companyId && row.companyId !== companyWhere(scope).companyId) {
    return null;
  }
  const base = mapEmployee(row);
  const activePg = getActivePayrollAssignment(row.payrollAssignments);
  return {
    ...base,
    clientName: row.company?.name,
    projectName: row.projectAssignments[0]
      ? `${row.projectAssignments[0].project.code} · ${row.projectAssignments[0].project.name}`
      : undefined,
    payrollGroupName: formatPayrollGroupLabel(activePg),
    payrollGroupId: activePg?.payrollGroupId ?? activePg?.payrollGroup?.id ?? null,
  };
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
  // Master client list for ops roles with clients module access
  if (
    !["SUPER_ADMIN", "DIRECTOR", "PAYROLL_ADMIN", "PAYROLL_OPERATOR", "FINANCE", "HR"].includes(
      scope.role,
    )
  ) {
    return [];
  }
  const where =
    scope.companyId && scope.role !== "SUPER_ADMIN" && scope.role !== "DIRECTOR"
      ? { id: scope.companyId }
      : {};
  const rows = await prisma.company.findMany({
    where,
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
  const companyFilter = where.companyId
    ? { companyId: where.companyId }
    : {};

  const [
    employees,
    periods,
    pendingApprovals,
    waitingTransfer,
    waitingVerification,
    rejectedProof,
    verifiedToday,
  ] = await Promise.all([
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
        verifiedAt: {
          gte: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
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
      label: "Headcount",
      value: String(employees),
      change: probation ? `${probation} on probation` : "Active workforce",
      trend: "neutral",
      href: "/employees",
    },
    {
      label: "Payroll value",
      value: current ? formatRupiah(Number(current.totalNet)) : formatRupiah(0),
      change: current
        ? `${current.name} · ${current.fundingModel === "SELF_FUNDED" ? "Self-transfer" : "Working capital"}`
        : "No period",
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Approval pending",
      value: String(pendingApprovals),
      change: pendingApprovals ? "Action required" : "Queue clear",
      trend: pendingApprovals ? "down" : "up",
      href: "/approval",
    },
    {
      label: "Exception",
      value: String(rejectedProof + (waitingVerification > 0 ? waitingVerification : 0)),
      change: waitingTransfer
        ? `${waitingTransfer} waiting transfer`
        : "No transfer backlog",
      trend: rejectedProof || waitingVerification ? "down" : "neutral",
      href: "/payment-confirmation",
    },
    {
      label: "Payment success",
      value: String(verifiedToday),
      change: "Verified confirmations today",
      trend: "up",
      href: "/payment-confirmation",
    },
  ];

  if (canViewExecutiveDashboard(role)) {
    const closed = await prisma.payrollPeriod.count({
      where: { ...companyFilter, status: "CLOSED" },
    });
    const pendingConfirmation = await prisma.payrollPeriod.count({
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
    const settlementPending = await prisma.workingCapitalRequest.count({
      where: {
        ...companyFilter,
        settlementStatus: { in: ["PENDING", "PARTIAL"] },
      },
    });

    ops.push(
      {
        label: "Invoice outstanding",
        value: String(pendingConfirmation),
        change: "Cycles awaiting confirmation / billing close",
        trend: pendingConfirmation ? "down" : "neutral",
        href: "/payment-confirmation",
      },
      {
        label: "Collection",
        value: String(closed),
        change: "Closed payroll periods (collections complete)",
        trend: "up",
        href: "/reports",
      },
      {
        label: "Payroll SLA",
        value: pendingApprovals || waitingVerification ? "At risk" : "On track",
        change: closed
          ? `${closed} closed · ${employees} headcount`
          : "Monitor cycle velocity",
        trend: pendingApprovals || waitingVerification ? "down" : "up",
        href: "/reports",
      },
    );

    if (canViewWorkingCapitalLimits(role)) {
      const exposure = await prisma.workingCapitalRequest.aggregate({
        where: {
          status: {
            in: ["APPROVED", "FUNDED", "OUTSTANDING", "SETTLEMENT_DUE"],
          },
        },
        _sum: { approvedAmount: true },
      });
      ops.push({
        label: "Working capital",
        value: formatRupiah(Number(exposure._sum.approvedAmount ?? 0)),
        change: `Settlement pending: ${settlementPending}`,
        trend: "down",
        href: "/working-capital",
      });
    }

    if (canViewSalesPipeline(role)) {
      const pipeline = await prisma.salesOpportunity.aggregate({
        where: { status: "OPEN" },
        _sum: { weightedPipelineValue: true },
      });
      ops.push({
        label: "Weighted pipeline",
        value: formatRupiah(Number(pipeline._sum.weightedPipelineValue ?? 0)),
        change: "Internal commercial only",
        trend: "up",
        href: "/sales",
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

/** Executive table: payroll grouped by client company / project (read-only). */
export async function getPayrollByClientProject(scope?: SessionScope) {
  const where = scope ? companyWhere(scope) : {};

  const projects = await prisma.project.findMany({
    where: scope?.companyId && scope.role !== "SUPER_ADMIN"
      ? { companyId: scope.companyId }
      : {},
    include: {
      company: true,
      assignments: { where: { isActive: true } },
      payrollPeriods: {
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: 12,
  });

  if (projects.length > 0) {
    return projects.map((p) => {
      const period = p.payrollPeriods[0];
      const empCount =
        p.assignments.length ||
        period?.employeeCount ||
        0;
      const bruto = period
        ? Number(period.totalGross || period.totalNet || 0)
        : Number(p.company.actualManagedPayroll ?? 0);
      const status = period?.status ?? "DRAFT";
      const sla =
        status === "CLOSED" || status === "DISBURSED"
          ? 98
          : status === "WAITING"
            ? 92
            : status === "APPROVED"
              ? 95
              : 88;
      return {
        id: p.id,
        clientName: p.clientName || p.company.name,
        projectName: [p.name, p.site || p.location].filter(Boolean).join(" · "),
        employees: Number(empCount),
        totalBruto: bruto,
        status,
        sla,
      };
    });
  }

  // Fallback: companies with latest payroll period
  const companies = await prisma.company.findMany({
    where:
      scope?.companyId && scope.role !== "SUPER_ADMIN"
        ? { id: scope.companyId }
        : where.companyId
          ? { id: where.companyId as string }
          : {},
    include: {
      employees: {
        where: { status: { in: ["ACTIVE", "PROBATION"] } },
        select: { id: true },
      },
      payrollPeriods: {
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  return companies.map((c) => {
    const period = c.payrollPeriods[0];
    const status = period?.status ?? "DRAFT";
    const sla =
      status === "CLOSED" || status === "DISBURSED"
        ? 98
        : status === "WAITING"
          ? 92
          : status === "APPROVED"
            ? 95
            : 88;
    return {
      id: c.id,
      clientName: c.name,
      projectName: period?.name ?? "Periode aktif",
      employees: period?.employeeCount ?? c.employees.length,
      totalBruto: period
        ? Number(period.totalGross || period.totalNet || 0)
        : Number(c.actualManagedPayroll ?? 0),
      status,
      sla,
    };
  });
}
