import type { Role } from "@/types";

/**
 * I1 Master Data capability checks mapped to existing Role enum.
 * Enforced on API — UI only mirrors this.
 */
export type MasterDataCapability =
  | "MASTER_DATA_VIEW"
  | "MASTER_DATA_MANAGE"
  | "PAYROLL_GROUP_VIEW"
  | "PAYROLL_GROUP_MANAGE"
  | "PAY_CYCLE_VIEW"
  | "PAY_CYCLE_MANAGE"
  | "PAYROLL_PERIOD_CREATE"
  | "PAYROLL_PERIOD_MANAGE";

const MANAGE_ROLES: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "DIRECTOR",
];

const VIEW_ROLES: Role[] = [
  ...MANAGE_ROLES,
  "PAYROLL_OPERATOR",
  "FINANCE",
  "FINANCE_MANAGER",
  "HR",
  "AUDITOR",
  "VIEWER",
  "APPROVER",
];

const PERIOD_CREATE: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "PAYROLL_OPERATOR",
  "DIRECTOR",
];

const PERIOD_MANAGE: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "DIRECTOR",
];

export function canMasterData(
  role: Role,
  capability: MasterDataCapability,
): boolean {
  switch (capability) {
    case "MASTER_DATA_VIEW":
    case "PAYROLL_GROUP_VIEW":
    case "PAY_CYCLE_VIEW":
      return VIEW_ROLES.includes(role);
    case "MASTER_DATA_MANAGE":
    case "PAYROLL_GROUP_MANAGE":
    case "PAY_CYCLE_MANAGE":
      return MANAGE_ROLES.includes(role);
    case "PAYROLL_PERIOD_CREATE":
      return PERIOD_CREATE.includes(role);
    case "PAYROLL_PERIOD_MANAGE":
      return PERIOD_MANAGE.includes(role);
    default:
      return false;
  }
}
