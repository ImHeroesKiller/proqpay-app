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
  | "import"
  | "scheme_builder"
  | "billing"
  | "validation";

/** Internal commercial / confidential modules. */
export const CONFIDENTIAL_MODULES: AppModule[] = [
  "clients",
  "sales_pipeline",
  "pricing",
  "capital_partners",
  "capital_allocations",
];

const ENTERPRISE_OPS: AppModule[] = [
  "import",
  "scheme_builder",
  "billing",
  "validation",
];

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
    ...ENTERPRISE_OPS,
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
    ...ENTERPRISE_OPS,
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
    "clients",
    ...ENTERPRISE_OPS,
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
    "import",
    "validation",
    "scheme_builder",
    "clients",
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
    "billing",
    "validation",
    "clients",
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
    "import",
    "clients",
  ],
  APPROVER: [
    "dashboard",
    "payroll",
    "approval",
    "payment_instructions",
    "payment_confirmation",
    "reports",
    "audit",
    "validation",
    "scheme_builder",
  ],
  AUDITOR: [
    "dashboard",
    "payroll",
    "payment_instructions",
    "payment_confirmation",
    "reports",
    "audit",
    "validation",
    "billing",
  ],
  VIEWER: ["dashboard", "payroll", "reports"],
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
