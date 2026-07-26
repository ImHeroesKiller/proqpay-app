import { prisma } from "@/lib/db";
import { companyWhere } from "@/lib/auth/scope";
import type { SessionScope } from "@/lib/auth/scope";
import type { AlertItem, AuditLog, KpiCard, PayrollPeriod, Role } from "@/types";
import { formatRupiah } from "@/lib/utils";

export type DashboardDateRange = {
  start: Date;
  end: Date;
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(String(value));
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeRegion(value: string | null | undefined): string {
  const text = (value ?? "").toLowerCase();
  if (/papua|maluku/.test(text)) return "Maluku & Papua";
  if (/sulawesi/.test(text)) return "Sulawesi";
  if (/bali|nusa tenggara|lombok|kupang/.test(text)) return "Bali & Nusa Tenggara";
  if (/kalimantan|banjarmasin|samarinda|balikpapan|pontianak/.test(text)) return "Kalimantan";
  if (/sumatera|sumatra|aceh|medan|padang|pekanbaru|palembang|lampung|jambi|bengkulu|batam/.test(text)) return "Sumatera";
  return "Jawa";
}

async function safely<T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(`[dashboard:${label}]`, error);
    return fallback;
  }
}

export async function getDashboardSnapshot(
  role: Role,
  scope: SessionScope,
  range: DashboardDateRange,
) {
  const where = companyWhere(scope);
  const companyId = scope.role !== "SUPER_ADMIN" ? scope.companyId ?? undefined : undefined;
  const payrollWhere = {
    ...(companyId ? { companyId } : {}),
    periodStart: { lte: range.end },
    periodEnd: { gte: range.start },
  };
  const approvalWhere = {
    ...(companyId ? { payrollPeriod: { companyId } } : {}),
    payrollPeriod: {
      ...(companyId ? { companyId } : {}),
      periodStart: { lte: range.end },
      periodEnd: { gte: range.start },
    },
  };

  const employees = await safely("employee-count", 0, () =>
    prisma.employee.count({
      where: {
        ...where,
        status: { in: ["ACTIVE", "PROBATION"] },
        joinDate: { lte: range.end },
      },
    }),
  );

  const probation = await safely("probation-count", 0, () =>
    prisma.employee.count({
      where: {
        ...where,
        status: "PROBATION",
        joinDate: { lte: range.end },
      },
    }),
  );

  const periodRows = await safely("periods", [], () =>
    prisma.payrollPeriod.findMany({
      where: payrollWhere,
      orderBy: { periodStart: "desc" },
      take: 24,
      select: {
        id: true,
        companyId: true,
        name: true,
        periodStart: true,
        periodEnd: true,
        payDate: true,
        status: true,
        fundingModel: true,
        fundingStatus: true,
        paymentInstructionStatus: true,
        reconciliationStatus: true,
        confirmationStatus: true,
        executionType: true,
        employeeCount: true,
        totalGross: true,
        totalDeductions: true,
        totalNet: true,
        createdAt: true,
      },
    }),
  );

  const payrollPeriods: PayrollPeriod[] = periodRows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    periodStart: isoDate(row.periodStart),
    periodEnd: isoDate(row.periodEnd),
    payDate: isoDate(row.payDate),
    status: row.status,
    fundingModel: row.fundingModel,
    fundingStatus: row.fundingStatus,
    paymentInstructionStatus: row.paymentInstructionStatus,
    reconciliationStatus: row.reconciliationStatus,
    confirmationStatus: row.confirmationStatus,
    executionType: row.executionType,
    employeeCount: row.employeeCount,
    totalGross: toNumber(row.totalGross),
    totalDeductions: toNumber(row.totalDeductions),
    totalNet: toNumber(row.totalNet),
    createdAt: row.createdAt.toISOString(),
  }));

  const pendingApprovals = await safely("pending-approvals", 0, () =>
    prisma.approvalStep.count({ where: { ...approvalWhere, status: "PENDING" } }),
  );

  const waitingVerification = await safely("waiting-verification", 0, () =>
    prisma.paymentConfirmation.count({
      where: {
        ...(companyId ? { companyId } : {}),
        paymentDate: { gte: range.start, lte: range.end },
        status: { in: ["UPLOADED", "UNDER_REVIEW"] },
      },
    }),
  );

  const rejectedProof = await safely("rejected-proof", 0, () =>
    prisma.paymentConfirmation.count({
      where: {
        ...(companyId ? { companyId } : {}),
        paymentDate: { gte: range.start, lte: range.end },
        status: "REJECTED",
      },
    }),
  );

  const failedItems = await safely("failed-payment-items", 0, () =>
    prisma.paymentInstructionItem.count({
      where: {
        status: "FAILED",
        paymentInstruction: {
          ...(companyId ? { companyId } : {}),
          payrollPeriod: {
            periodStart: { lte: range.end },
            periodEnd: { gte: range.start },
          },
        },
      },
    }),
  );

  const current =
    payrollPeriods.find((period) =>
      [
        "WAITING",
        "APPROVED",
        "PAYMENT_INSTRUCTION_GENERATED",
        "WAITING_CLIENT_TRANSFER",
        "TRANSFER_PROOF_UPLOADED",
        "UNDER_VERIFICATION",
      ].includes(period.status),
    ) ?? payrollPeriods[0];

  const dashboardKpis: KpiCard[] = [
    {
      label: "Headcount",
      value: String(employees),
      change: probation ? `${probation} on probation` : "Active workforce",
      trend: "neutral",
      href: "/employees",
    },
    {
      label: "Payroll value",
      value: current ? formatRupiah(current.totalNet) : formatRupiah(0),
      change: current?.name ?? "No period",
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
      value: String(rejectedProof + waitingVerification),
      change: failedItems ? `${failedItems} failed payment item(s)` : "No payment failure",
      trend: rejectedProof || waitingVerification || failedItems ? "down" : "neutral",
      href: "/payment-confirmation",
    },
  ];

  const dashboardAlerts: AlertItem[] = [];
  if (pendingApprovals > 0) {
    dashboardAlerts.push({
      id: "al_approval",
      type: "warning",
      title: "Approval pending",
      description: `${pendingApprovals} approval step(s) require action.`,
      time: "Live",
    });
  }
  if (failedItems > 0) {
    dashboardAlerts.push({
      id: "al_fail",
      type: "danger",
      title: "Failed payment items",
      description: `${failedItems} instruction item(s) marked FAILED.`,
      time: "Live",
    });
  }
  dashboardAlerts.push({
    id: "al_models",
    type: "success",
    title: "Payroll service active",
    description: "Client-funded and working-capital payroll flows remain available.",
    time: "Policy",
  });

  const chartData = payrollPeriods
    .filter((period) => period.totalNet > 0)
    .slice()
    .reverse()
    .map((period) => ({
      month: period.name.split(" ")[0]?.slice(0, 3) ?? period.name,
      amount: period.totalNet / 1_000_000,
      fundingModel: period.fundingModel,
    }));

  const auditRows = await safely("audit", [], () =>
    prisma.auditLog.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        timestamp: { gte: range.start, lte: range.end },
      },
      orderBy: { timestamp: "desc" },
      take: 8,
      select: {
        id: true,
        userName: true,
        userRole: true,
        action: true,
        entity: true,
        entityId: true,
        detail: true,
        timestamp: true,
        ip: true,
      },
    }),
  );

  const auditLogs: AuditLog[] = auditRows.map((row) => ({
    id: row.id,
    userName: row.userName,
    userRole: row.userRole,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    detail: row.detail ?? undefined,
    timestamp: row.timestamp.toISOString(),
    ip: row.ip,
  }));

  const projectRows = await safely("projects", [], () =>
    prisma.project.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { name: "asc" },
      take: 20,
      select: {
        id: true,
        clientName: true,
        name: true,
        site: true,
        location: true,
        company: { select: { name: true, actualManagedPayroll: true } },
        assignments: { where: { isActive: true }, select: { id: true } },
        payrollPeriods: {
          where: {
            periodStart: { lte: range.end },
            periodEnd: { gte: range.start },
          },
          orderBy: { periodStart: "desc" },
          take: 1,
          select: { employeeCount: true, totalGross: true, totalNet: true, status: true },
        },
      },
    }),
  );

  const clientRows = projectRows.map((project) => {
    const period = project.payrollPeriods[0];
    const status = period?.status ?? "DRAFT";
    const sla =
      status === "CLOSED" || status === "DISBURSED"
        ? 98
        : status === "APPROVED"
          ? 95
          : status === "WAITING"
            ? 92
            : 88;
    return {
      id: project.id,
      clientName: project.clientName || project.company.name,
      projectName: [project.name, project.site || project.location].filter(Boolean).join(" · "),
      employees: project.assignments.length || period?.employeeCount || 0,
      totalBruto: period
        ? toNumber(period.totalGross ?? period.totalNet)
        : toNumber(project.company.actualManagedPayroll),
      status,
      sla,
    };
  });

  const mapEmployeeRows = await safely("map-employees", [], () =>
    prisma.employee.findMany({
      where: {
        ...where,
        status: { in: ["ACTIVE", "PROBATION"] },
        joinDate: { lte: range.end },
      },
      orderBy: { name: "asc" },
      take: 250,
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        position: true,
        status: true,
        company: { select: { name: true, address: true } },
        payrollAssignments: {
          where: { isActive: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            placementLocation: true,
            project: { select: { name: true, location: true, site: true } },
            site: { select: { city: true, province: true } },
          },
        },
      },
    }),
  );

  const mapEmployees = mapEmployeeRows.map((employee) => {
    const assignment = employee.payrollAssignments[0];
    const placementLocation =
      assignment?.placementLocation ||
      assignment?.site?.province ||
      assignment?.site?.city ||
      assignment?.project?.location ||
      assignment?.project?.site ||
      employee.company.address ||
      "Indonesia";
    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      companyName: employee.company.name,
      projectName: assignment?.project?.name ?? "",
      placementLocation,
      region: normalizeRegion(placementLocation),
    };
  });

  return {
    dashboardKpis,
    dashboardAlerts,
    payrollPeriods,
    chartData,
    auditLogs,
    clientRows,
    mapEmployees,
  };
}
