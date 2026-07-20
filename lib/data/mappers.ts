import type {
  ApprovalStep,
  AuditLog,
  DisbursementBatch,
  Employee,
  PayrollLine,
  PayrollPeriod,
  User,
  WorkingCapitalRequest,
} from "@/types";
import type {
  ApprovalStep as DbApprovalStep,
  AuditLog as DbAuditLog,
  DisbursementBatch as DbDisbursementBatch,
  Employee as DbEmployee,
  PayrollLine as DbPayrollLine,
  PayrollPeriod as DbPayrollPeriod,
  User as DbUser,
  WorkingCapitalRequest as DbWorkingCapitalRequest,
  BankAccount as DbBankAccount,
  Company as DbCompany,
} from "@prisma/client";

function num(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function dateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function mapUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarInitials: row.avatarInitials,
    department: row.department ?? undefined,
  };
}

export function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    name: row.name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    position: row.position,
    joinDate: dateOnly(row.joinDate),
    status: row.status,
    baseSalary: num(row.baseSalary),
    bankName: row.bankName,
    bankAccount: row.bankAccount,
    taxStatus: row.taxStatus,
    bpjsNumber: row.bpjsNumber,
    npwp: row.npwp,
  };
}

export function mapPayrollPeriod(row: DbPayrollPeriod): PayrollPeriod {
  return {
    id: row.id,
    name: row.name,
    periodStart: dateOnly(row.periodStart),
    periodEnd: dateOnly(row.periodEnd),
    payDate: dateOnly(row.payDate),
    status: row.status,
    employeeCount: row.employeeCount,
    totalGross: num(row.totalGross),
    totalDeductions: num(row.totalDeductions),
    totalNet: num(row.totalNet),
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

export function mapPayrollLine(row: DbPayrollLine): PayrollLine {
  return {
    id: row.id,
    payrollPeriodId: row.payrollPeriodId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    baseSalary: num(row.baseSalary),
    allowances: num(row.allowances),
    overtime: num(row.overtime),
    bonuses: num(row.bonuses),
    deductions: num(row.deductions),
    tax: num(row.tax),
    bpjs: num(row.bpjs),
    netPay: num(row.netPay),
  };
}

export function mapApprovalStep(row: DbApprovalStep): ApprovalStep {
  return {
    id: row.id,
    payrollPeriodId: row.payrollPeriodId,
    level: row.level,
    approverName: row.approverName,
    role: row.role,
    status: row.status,
    comment: row.comment ?? undefined,
    actedAt: iso(row.actedAt),
  };
}

export function mapDisbursement(row: DbDisbursementBatch): DisbursementBatch {
  return {
    id: row.id,
    payrollPeriodId: row.payrollPeriodId,
    periodName: row.periodName,
    bankName: row.bankName,
    totalAmount: num(row.totalAmount),
    itemCount: row.itemCount,
    status: row.status,
    referenceNumber: row.referenceNumber,
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
    processedAt: iso(row.processedAt),
  };
}

export function mapWorkingCapital(
  row: DbWorkingCapitalRequest,
): WorkingCapitalRequest {
  return {
    id: row.id,
    payrollPeriodId: row.payrollPeriodId,
    periodName: row.periodName,
    requestedAmount: num(row.requestedAmount),
    approvedAmount: num(row.approvedAmount),
    status: row.status,
    requestedAt: iso(row.requestedAt) ?? new Date().toISOString(),
    dueDate: dateOnly(row.dueDate),
    repaidAmount: num(row.repaidAmount),
  };
}

export function mapAuditLog(row: DbAuditLog): AuditLog {
  return {
    id: row.id,
    userName: row.userName,
    userRole: row.userRole,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    timestamp: iso(row.timestamp) ?? new Date().toISOString(),
    ip: row.ip,
  };
}

export type CompanySettingsView = {
  name: string;
  legalName: string;
  npwp: string;
  address: string;
  payDay: number;
  currency: string;
  approvalLevels: string[];
  bankAccounts: { bank: string; account: string; label: string }[];
};

export function mapCompanySettings(
  company: DbCompany,
  banks: DbBankAccount[],
): CompanySettingsView {
  return {
    name: company.name,
    legalName: company.legalName ?? company.name,
    npwp: company.npwp ?? "—",
    address: company.address ?? "—",
    payDay: 5,
    currency: "IDR",
    approvalLevels: [
      "Payroll Admin",
      "Finance Manager",
      "Finance Control",
      "Director",
    ],
    bankAccounts: banks.map((b) => ({
      bank: b.bank,
      account: b.account,
      label: b.label,
    })),
  };
}
