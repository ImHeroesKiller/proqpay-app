import type { Role } from "@/types";

/** Module keys used for role-based navigation and page guards. */
export type AppModule =
  | "dashboard"
  | "employees"
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
  | "roadmap";

/** Internal commercial / confidential modules. */
export const CONFIDENTIAL_MODULES: AppModule[] = [
  "clients",
  "sales_pipeline",
  "pricing",
  "capital_partners",
  "capital_allocations",
];

const ROLE_MODULES: Record<Role, AppModule[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "employees",
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
  ],
  DIRECTOR: [
    "dashboard",
    "employees",
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
  ],
  FINANCE: [
    "dashboard",
    "employees",
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
    "roadmap",
  ],
  PAYROLL_ADMIN: [
    "dashboard",
    "employees",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "working_capital",
    "disbursement",
    "reports",
    "audit",
    "settings",
    "roadmap",
  ],
  APPROVER: [
    "dashboard",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "reports",
    "audit",
    "roadmap",
  ],
  HR: [
    "dashboard",
    "employees",
    "payroll",
    "payment_confirmation",
    "reports",
    "settings",
    "roadmap",
  ],
  VIEWER: ["dashboard", "payroll", "payment_confirmation", "reports", "audit", "roadmap"],
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
    role === "FINANCE"
  );
}

export function canViewWorkingCapitalLimits(role: Role): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "DIRECTOR" ||
    role === "FINANCE" ||
    role === "PAYROLL_ADMIN"
  );
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
