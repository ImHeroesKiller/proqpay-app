import type { Role } from "@/types";

/** Module keys used for role-based navigation and page guards. */
export type AppModule =
  | "dashboard"
  | "employees"
  | "projects"
  | "attendance"
  | "payroll"
  | "approval"
  | "payment_instructions"
  | "payment_confirmation"
  | "working_capital"
  | "disbursement"
  | "reports"
  | "audit"
  | "settings"
  | "clients"
  | "sales_pipeline"
  | "pricing"
  | "capital_partners"
  | "capital_allocations"
  | "roadmap"
  /** Phase 1A Financial Core modules */
  | "invoices"
  | "receivables"
  | "client_payments"
  | "treasury"
  | "collection";

/** Internal commercial / confidential modules. */
export const CONFIDENTIAL_MODULES: AppModule[] = [
  "clients",
  "sales_pipeline",
  "pricing",
  "capital_partners",
  "capital_allocations",
];

const FINANCIAL_CORE: AppModule[] = [
  "invoices",
  "receivables",
  "client_payments",
  "working_capital",
  "collection",
];

const TREASURY_CORE: AppModule[] = ["treasury", ...FINANCIAL_CORE];

const ROLE_MODULES: Record<Role, AppModule[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "clients",
    "sales_pipeline",
    "pricing",
    "capital_partners",
    "capital_allocations",
    "roadmap",
    ...TREASURY_CORE,
  ],
  DIRECTOR: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "clients",
    "sales_pipeline",
    "pricing",
    "capital_partners",
    "capital_allocations",
    ...TREASURY_CORE,
  ],
  PAYROLL_ADMIN: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "invoices",
  ],
  PAYROLL_MANAGER: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "invoices",
  ],
  PAYROLL_OPERATOR: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "payment_instructions",
    "payment_confirmation",
    "reports",
  ],
  FINANCE: [
    "dashboard",
    "employees",
    "projects",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "capital_partners",
    "capital_allocations",
    ...TREASURY_CORE,
  ],
  FINANCE_MANAGER: [
    "dashboard",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "capital_partners",
    "capital_allocations",
    ...TREASURY_CORE,
  ],
  FINANCE_STAFF: [
    "dashboard",
    "payroll",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "reports",
    "invoices",
    "receivables",
    "client_payments",
    "collection",
  ],
  HR: [
    "dashboard",
    "employees",
    "projects",
    "attendance",
    "payroll",
    "payment_confirmation",
    "reports",
    "settings",
  ],
  APPROVER: [
    "dashboard",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "reports",
    "audit",
  ],
  AUDITOR: [
    "dashboard",
    "payroll",
    "payment_instructions",
    "payment_confirmation",
    "reports",
    "audit",
    "invoices",
    "receivables",
  ],
  VIEWER: ["dashboard", "payroll", "reports"],
  CLIENT: ["dashboard", "invoices", "receivables", "client_payments"],
};

export function canAccessModule(role: Role, module: AppModule): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

export function isInternalCommercialRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "DIRECTOR";
}

export function canViewExecutiveDashboard(role: Role): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "DIRECTOR" ||
    role === "FINANCE" ||
    role === "FINANCE_MANAGER"
  );
}

export function canViewWorkingCapitalLimits(role: Role): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "DIRECTOR" ||
    role === "FINANCE" ||
    role === "FINANCE_MANAGER" ||
    role === "FINANCE_STAFF" ||
    role === "PAYROLL_ADMIN" ||
    role === "PAYROLL_MANAGER"
  );
}

/** Treasury is restricted — not visible to CLIENT / VIEWER / generic operators. */
export function canViewTreasury(role: Role): boolean {
  return canAccessModule(role, "treasury");
}

export function canManageInvoices(role: Role): boolean {
  return canAccessModule(role, "invoices");
}

export function canViewPricing(role: Role): boolean {
  return isInternalCommercialRole(role);
}

export function canViewSalesPipeline(role: Role): boolean {
  return isInternalCommercialRole(role);
}

export function modulesForRole(role: Role): AppModule[] {
  return ROLE_MODULES[role] ?? ["dashboard"];
}
