import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import type { AlertItem, KpiCard } from "@/types";
import {
  mapApprovalStep,
  mapAuditLog,
  mapCompanySettings,
  mapDisbursement,
  mapEmployee,
  mapPayrollLine,
  mapPayrollPeriod,
  mapUser,
  mapWorkingCapital,
} from "@/lib/data/mappers";

export async function getUsers() {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapUser);
}

export async function getUserByEmail(email: string) {
  const row = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return row;
}

export async function getEmployees() {
  const rows = await prisma.employee.findMany({
    orderBy: { employeeCode: "asc" },
  });
  return rows.map(mapEmployee);
}

export async function getEmployeeById(id: string) {
  const row = await prisma.employee.findUnique({ where: { id } });
  return row ? mapEmployee(row) : null;
}

export async function getPayrollPeriods() {
  const rows = await prisma.payrollPeriod.findMany({
    orderBy: { periodStart: "desc" },
  });
  return rows.map(mapPayrollPeriod);
}

export async function getPayrollPeriodById(id: string) {
  const row = await prisma.payrollPeriod.findUnique({ where: { id } });
  return row ? mapPayrollPeriod(row) : null;
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

export async function getDisbursements() {
  const rows = await prisma.disbursementBatch.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDisbursement);
}

export async function getWorkingCapitalRequests() {
  const rows = await prisma.workingCapitalRequest.findMany({
    orderBy: { requestedAt: "desc" },
  });
  return rows.map(mapWorkingCapital);
}

export async function getAuditLogs() {
  const rows = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return rows.map(mapAuditLog);
}

export async function getCompanySettings() {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!company) return null;
  const banks = await prisma.bankAccount.findMany({
    where: { companyId: company.id },
    orderBy: { label: "asc" },
  });
  return mapCompanySettings(company, banks);
}

export async function getDashboardKpis(): Promise<KpiCard[]> {
  const [employees, periods, pendingApprovals] = await Promise.all([
    prisma.employee.count({ where: { status: { in: ["ACTIVE", "PROBATION"] } } }),
    prisma.payrollPeriod.findMany({ orderBy: { periodStart: "desc" }, take: 2 }),
    prisma.approvalStep.count({ where: { status: "PENDING" } }),
  ]);

  const current =
    periods.find((p) => p.status === "WAITING" || p.status === "APPROVED") ??
    periods[0];
  const probation = await prisma.employee.count({
    where: { status: "PROBATION" },
  });

  return [
    {
      label: "Payroll this month",
      value: current ? formatRupiah(Number(current.totalNet)) : formatRupiah(0),
      change: current ? current.name : "No period",
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
      label: "Upcoming pay date",
      value: current
        ? current.payDate.toISOString().slice(0, 10)
        : "—",
      change: current ? current.name : "—",
      trend: "neutral",
      href: current ? `/payroll/${current.id}` : "/payroll",
    },
  ];
}

export async function getDashboardAlerts(): Promise<AlertItem[]> {
  const pending = await prisma.approvalStep.count({
    where: { status: "PENDING" },
  });
  const waiting = await prisma.payrollPeriod.findFirst({
    where: { status: "WAITING" },
    orderBy: { periodStart: "desc" },
  });
  const wc = await prisma.workingCapitalRequest.findFirst({
    where: { status: "APPROVED" },
    orderBy: { requestedAt: "desc" },
  });
  const paid = await prisma.disbursementBatch.findFirst({
    where: { status: "PAID" },
    orderBy: { processedAt: "desc" },
  });

  const alerts: AlertItem[] = [];
  if (waiting && pending > 0) {
    alerts.push({
      id: "al_approval",
      type: "warning",
      title: "Approval pending",
      description: `${waiting.name} payroll has ${pending} open approval step(s).`,
      time: "Live",
    });
  }
  if (wc) {
    alerts.push({
      id: "al_wc",
      type: "info",
      title: "Working capital ready",
      description: `${formatRupiah(Number(wc.approvedAmount))} approved for ${wc.periodName}.`,
      time: "Live",
    });
  }
  alerts.push({
    id: "al_compliance",
    type: "danger",
    title: "Compliance reminder",
    description: "Review tax withholding preview before final lock.",
    time: "Policy",
  });
  if (paid) {
    alerts.push({
      id: "al_paid",
      type: "success",
      title: "Disbursement complete",
      description: `${paid.periodName}: ${paid.itemCount} transfers marked PAID via ${paid.bankName}.`,
      time: "History",
    });
  }
  return alerts;
}

export async function getPayrollChartData() {
  const periods = await prisma.payrollPeriod.findMany({
    where: { totalNet: { gt: 0 } },
    orderBy: { periodStart: "asc" },
    take: 6,
  });
  return periods.map((p) => ({
    month: p.name.split(" ")[0]?.slice(0, 3) ?? p.name,
    amount: Number(p.totalNet) / 1_000_000,
  }));
}
