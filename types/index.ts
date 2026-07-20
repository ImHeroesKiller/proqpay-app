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
  | "DISBURSED"
  | "PAYMENT_INSTRUCTION_GENERATED"
  | "WAITING_CLIENT_TRANSFER"
  | "TRANSFER_PROOF_UPLOADED"
  | "UNDER_VERIFICATION"
  | "VERIFIED"
  | "CLOSED";

export type PaymentConfirmationStatus =
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "NEED_REVISION";

export type PaymentExecutionModel =
  | "CLIENT_SELF_TRANSFER"
  | "WORKING_CAPITAL"
  | "BANK_API"
  | "MANUAL";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DisbursementStatus = "PENDING" | "PAID" | "FAILED";

export type WorkingCapitalStatus =
  | "REQUESTED"
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "ALLOCATING"
  | "DISBURSED"
  | "FUNDED"
  | "OUTSTANDING"
  | "SETTLEMENT_DUE"
  | "PARTIALLY_REPAID"
  | "REPAID"
  | "OVERDUE"
  | "CANCELLED";

export type EmploymentStatus =
  | "ACTIVE"
  | "PROBATION"
  | "RESIGNED"
  | "TERMINATED";

export type PayrollFundingModel = "SELF_FUNDED" | "WORKING_CAPITAL";

export type PeriodFundingStatus =
  | "NOT_REQUIRED"
  | "NOT_STARTED"
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "ALLOCATED"
  | "FUNDED"
  | "REJECTED"
  | "SETTLED";

export type PaymentInstructionStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "PROCESSING"
  | "EXECUTED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "CANCELLED";

export type ReconciliationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "RECONCILED"
  | "EXCEPTION";

export type PaymentExecutionType =
  | "CLIENT_BANK_TRANSFER"
  | "PROQPAY_MANAGED_TRANSFER"
  | "FUNDING_PARTNER_TRANSFER"
  | "BANK_FILE_EXPORT"
  | "BANK_API_TRANSFER"
  | "MANUAL_EXTERNAL_TRANSFER";

export type BankingIntegrationStatus =
  | "SIMULATED"
  | "FILE_BASED"
  | "API_CONNECTED"
  | "MANUAL_CONFIRMATION";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  department?: string;
  organizationId?: string;
  companyId?: string | null;
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
  companyId?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrollStatus;
  fundingModel: PayrollFundingModel;
  fundingStatus: PeriodFundingStatus;
  paymentInstructionStatus: PaymentInstructionStatus;
  reconciliationStatus: ReconciliationStatus;
  confirmationStatus?: PaymentConfirmationStatus | null;
  executionType?: PaymentExecutionType;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdAt: string;
  sourceBankLabel?: string;
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
  companyId?: string | null;
  payrollPeriodId: string;
  periodName: string;
  requestNumber?: string | null;
  requestedAmount: number;
  approvedAmount: number;
  status: WorkingCapitalStatus;
  requestedAt: string;
  dueDate: string;
  repaidAmount: number;
  settlementStatus?: string;
}

export interface PaymentInstructionView {
  id: string;
  companyId: string;
  payrollPeriodId: string;
  instructionNumber: string;
  fundingModel: PayrollFundingModel;
  executionModel: PaymentExecutionModel;
  executionType: PaymentExecutionType;
  integrationStatus: BankingIntegrationStatus;
  totalRecords: number;
  totalAmount: number;
  currency: string;
  approvalStatus: ApprovalStatus;
  executionStatus: PaymentInstructionStatus;
  generatedAt?: string;
  submittedAt?: string;
  executedAt?: string;
  failureReason?: string;
  sourceBankLabel?: string;
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
  detail?: string | null;
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

export interface WorkflowStep {
  key: string;
  label: string;
  state: "done" | "current" | "upcoming" | "skipped";
}

export interface ClientCompanyView {
  id: string;
  name: string;
  legalName?: string | null;
  lifecycleStatus: string;
  industry?: string | null;
  defaultFundingModel: PayrollFundingModel;
  fundingEnabled: boolean;
  workingCapitalStatus: string;
  goLiveDate?: string | null;
}

export interface SalesOpportunityView {
  id: string;
  prospectName: string;
  stage: string;
  estimatedPayrollValue: number;
  probabilityPercentage: number;
  weightedPipelineValue: number;
  fundingInterest: boolean;
  proposedFundingModel?: PayrollFundingModel | null;
  status: string;
  expectedCloseDate?: string | null;
}

export interface CapitalPartnerView {
  id: string;
  displayName: string;
  legalName: string;
  status: string;
  agreementStatus: string;
  committedCapital: number;
  availableCapital: number;
}

export interface CapitalAllocationView {
  id: string;
  partnerName: string;
  periodName: string;
  allocatedAmount: number;
  allocationStatus: string;
  settlementStatus: string;
  platformFeeAmount: number;
}

export interface PricingRuleView {
  id: string;
  companyName: string;
  pricingType: string;
  percentageRate?: number | null;
  flatFee?: number | null;
  calculationBase: string;
  status: string;
  effectiveFrom: string;
}
