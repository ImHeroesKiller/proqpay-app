export type Role =
  | "SUPER_ADMIN"
  | "PAYROLL_ADMIN"
  | "FINANCE"
  | "HR"
  | "DIRECTOR"
  | "APPROVER"
  | "VIEWER";

export type PayrollStatus =
  | "DRAFT"
  | "WAITING"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED"
  | "DISBURSED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DisbursementStatus = "PENDING" | "PAID" | "FAILED";

export type WorkingCapitalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "DISBURSED"
  | "OUTSTANDING"
  | "REPAID";

export type EmploymentStatus = "ACTIVE" | "PROBATION" | "RESIGNED" | "TERMINATED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  department?: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joinDate: string;
  status: EmploymentStatus;
  baseSalary: number;
  bankName: string;
  bankAccount: string;
  taxStatus: string;
  bpjsNumber: string;
  npwp: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrollStatus;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: string;
}

export interface PayrollLine {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  tax: number;
  bpjs: number;
  netPay: number;
}

export interface ApprovalStep {
  id: string;
  payrollPeriodId: string;
  level: number;
  approverName: string;
  role: Role;
  status: ApprovalStatus;
  comment?: string;
  actedAt?: string;
}

export interface DisbursementBatch {
  id: string;
  payrollPeriodId: string;
  periodName: string;
  bankName: string;
  totalAmount: number;
  itemCount: number;
  status: DisbursementStatus;
  referenceNumber: string;
  createdAt: string;
  processedAt?: string;
}

export interface WorkingCapitalRequest {
  id: string;
  payrollPeriodId: string;
  periodName: string;
  requestedAmount: number;
  approvedAmount: number;
  status: WorkingCapitalStatus;
  requestedAt: string;
  dueDate: string;
  repaidAmount: number;
}

export interface AuditLog {
  id: string;
  userName: string;
  userRole: Role;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  ip: string;
}

export interface KpiCard {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  href?: string;
}

export interface AlertItem {
  id: string;
  type: "warning" | "info" | "danger" | "success";
  title: string;
  description: string;
  time: string;
}
