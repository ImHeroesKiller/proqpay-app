import type {
  ApprovalStep,
  AuditLog,
  CapitalAllocationView,
  CapitalPartnerView,
  ClientCompanyView,
  DisbursementBatch,
  Employee,
  PaymentInstructionView,
  PayrollLine,
  PayrollPeriod,
  PricingRuleView,
  SalesOpportunityView,
  User,
  WorkingCapitalRequest,
} from "@/types";
import type {
  ApprovalStep as DbApprovalStep,
  AuditLog as DbAuditLog,
  BankAccount as DbBankAccount,
  CapitalAllocation as DbCapitalAllocation,
  CapitalPartner as DbCapitalPartner,
  Company as DbCompany,
  DisbursementBatch as DbDisbursementBatch,
  Employee as DbEmployee,
  PaymentInstruction as DbPaymentInstruction,
  PayrollLine as DbPayrollLine,
  PayrollPeriod as DbPayrollPeriod,
  PricingRule as DbPricingRule,
  SalesOpportunity as DbSalesOpportunity,
  User as DbUser,
  WorkingCapitalRequest as DbWorkingCapitalRequest,
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

export function maskAccount(account: string | null | undefined): string {
  if (!account) return "••••";
  const digits = account.replace(/\s/g, "");
  if (digits.length <= 4) return "••••" + digits;
  return "••••" + digits.slice(-4);
}

export function mapUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarInitials: row.avatarInitials,
    department: row.department ?? undefined,
    organizationId: row.organizationId,
    companyId: row.companyId,
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
    bankAccount: maskAccount(row.bankAccount),
    taxStatus: row.taxStatus,
    bpjsNumber: row.bpjsNumber,
    npwp: row.npwp,
  };
}

export function mapPayrollPeriod(
  row: DbPayrollPeriod,
  sourceBank?: DbBankAccount | null,
): PayrollPeriod {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    periodStart: dateOnly(row.periodStart),
    periodEnd: dateOnly(row.periodEnd),
    payDate: dateOnly(row.payDate),
    status: row.status,
    fundingModel: row.fundingModel,
    fundingStatus: row.fundingStatus,
    paymentInstructionStatus: row.paymentInstructionStatus,
    reconciliationStatus: row.reconciliationStatus,
    confirmationStatus: row.confirmationStatus,
    executionType: row.executionType,
    employeeCount: row.employeeCount,
    totalGross: num(row.totalGross),
    totalDeductions: num(row.totalDeductions),
    totalNet: num(row.totalNet),
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
    sourceBankLabel: sourceBank
      ? `${sourceBank.label} · ${sourceBank.bank} · ${sourceBank.maskedAccountNumber ?? maskAccount(sourceBank.account)}`
      : undefined,
    latestCalculationId: row.latestCalculationId ?? undefined,
    projectedCalculationId: row.projectedCalculationId ?? undefined,
    projectedAt: iso(row.projectedAt),
    populationBuiltAt: iso(row.populationBuiltAt),
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
    companyId: row.companyId,
    payrollPeriodId: row.payrollPeriodId,
    periodName: row.periodName,
    requestNumber: row.requestNumber,
    requestedAmount: num(row.requestedAmount),
    approvedAmount: num(row.approvedAmount),
    status: row.status,
    requestedAt: iso(row.requestedAt) ?? new Date().toISOString(),
    dueDate: dateOnly(row.dueDate),
    repaidAmount: num(row.repaidAmount),
    settlementStatus: row.settlementStatus,
  };
}

export function mapPaymentInstruction(
  row: DbPaymentInstruction,
  sourceBank?: DbBankAccount | null,
): PaymentInstructionView {
  return {
    id: row.id,
    companyId: row.companyId,
    payrollPeriodId: row.payrollPeriodId,
    instructionNumber: row.instructionNumber,
    fundingModel: row.fundingModel,
    executionModel: row.executionModel,
    executionType: row.executionType,
    integrationStatus: row.integrationStatus,
    totalRecords: row.totalRecords,
    totalAmount: num(row.totalAmount),
    currency: row.currency,
    approvalStatus: row.approvalStatus,
    executionStatus: row.executionStatus,
    generatedAt: iso(row.generatedAt),
    submittedAt: iso(row.submittedAt),
    executedAt: iso(row.executedAt),
    failureReason: row.failureReason ?? undefined,
    sourceBankLabel: sourceBank
      ? `${sourceBank.label} · ${maskAccount(sourceBank.account)}`
      : undefined,
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
    detail: row.detail,
  };
}

export function mapClientCompany(row: DbCompany): ClientCompanyView {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    lifecycleStatus: row.lifecycleStatus,
    industry: row.industry,
    defaultFundingModel: row.defaultFundingModel,
    fundingEnabled: row.fundingEnabled,
    workingCapitalStatus: row.workingCapitalStatus,
    goLiveDate: row.goLiveDate ? dateOnly(row.goLiveDate) : null,
  };
}

export function mapSalesOpportunity(
  row: DbSalesOpportunity,
): SalesOpportunityView {
  return {
    id: row.id,
    prospectName: row.prospectName,
    stage: row.stage,
    estimatedPayrollValue: num(row.estimatedPayrollValue),
    probabilityPercentage: row.probabilityPercentage,
    weightedPipelineValue: num(row.weightedPipelineValue),
    fundingInterest: row.fundingInterest,
    proposedFundingModel: row.proposedFundingModel,
    status: row.status,
    expectedCloseDate: row.expectedCloseDate
      ? dateOnly(row.expectedCloseDate)
      : null,
  };
}

export function mapCapitalPartner(row: DbCapitalPartner): CapitalPartnerView {
  return {
    id: row.id,
    displayName: row.displayName,
    legalName: row.legalName,
    status: row.status,
    agreementStatus: row.agreementStatus,
    committedCapital: num(row.committedCapital),
    availableCapital: num(row.availableCapital),
  };
}

export function mapCapitalAllocation(
  row: DbCapitalAllocation & {
    capitalPartner?: DbCapitalPartner;
    workingCapitalRequest?: DbWorkingCapitalRequest;
  },
): CapitalAllocationView {
  return {
    id: row.id,
    partnerName: row.capitalPartner?.displayName ?? "Partner",
    periodName: row.workingCapitalRequest?.periodName ?? "—",
    allocatedAmount: num(row.allocatedAmount),
    allocationStatus: row.allocationStatus,
    settlementStatus: row.settlementStatus,
    platformFeeAmount: num(row.platformFeeAmount),
  };
}

export function mapPricingRule(
  row: DbPricingRule & { company?: DbCompany },
): PricingRuleView {
  return {
    id: row.id,
    companyName: row.company?.name ?? "—",
    pricingType: row.pricingType,
    percentageRate:
      row.percentageRate != null ? num(row.percentageRate) : null,
    flatFee: row.flatFee != null ? num(row.flatFee) : null,
    calculationBase: row.calculationBase,
    status: row.status,
    effectiveFrom: dateOnly(row.effectiveFrom),
  };
}

export type CompanySettingsView = {
  name: string;
  legalName: string;
  npwp: string;
  address: string;
  payDay: number;
  currency: string;
  defaultFundingModel: string;
  fundingEnabled: boolean;
  approvalLevels: string[];
  bankAccounts: { bank: string; account: string; label: string; purpose: string }[];
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
    defaultFundingModel: company.defaultFundingModel,
    fundingEnabled: company.fundingEnabled,
    approvalLevels: [
      "Payroll Admin",
      "Finance Manager",
      "Finance Control",
      "Director",
    ],
    bankAccounts: banks.map((b) => ({
      bank: b.bank,
      account: b.maskedAccountNumber ?? maskAccount(b.account),
      label: b.label,
      purpose: b.purpose,
    })),
  };
}
