import type { Role } from "@/types";

export type SessionScope = {
  userId: string;
  role: Role;
  organizationId?: string | null;
  companyId?: string | null;
};

/**
 * Company isolation: non–super-admin users are limited to their companyId.
 * SUPER_ADMIN / DIRECTOR may query org-wide internal data when companyId is null.
 */
export function companyWhere(scope: SessionScope): { companyId?: string } {
  if (scope.role === "SUPER_ADMIN") {
    return {};
  }
  if (scope.companyId) {
    return { companyId: scope.companyId };
  }
  // No company bound — return impossible filter for safety
  return { companyId: "00000000-0000-0000-0000-000000000000" };
}

export function assertCompanyAccess(
  scope: SessionScope,
  resourceCompanyId: string | null | undefined,
): boolean {
  if (scope.role === "SUPER_ADMIN") return true;
  if (!resourceCompanyId) return scope.role === "DIRECTOR";
  if (!scope.companyId) return false;
  return scope.companyId === resourceCompanyId;
}
