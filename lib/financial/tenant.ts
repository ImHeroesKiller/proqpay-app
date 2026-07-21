import type { Role } from "@/types";

/**
 * Resolve tenant scope for financial mutations.
 * Non–super-admin cannot override session organization / company from body.
 */
export function resolveFinancialTenant(opts: {
  role: Role;
  sessionOrganizationId?: string | null;
  sessionCompanyId?: string | null;
  bodyOrganizationId?: string | null;
  bodyCompanyId?: string | null;
}): { organizationId: string; companyId: string } {
  const isSuper = opts.role === "SUPER_ADMIN";

  const organizationId = isSuper
    ? (opts.bodyOrganizationId ?? opts.sessionOrganizationId ?? undefined)
    : (opts.sessionOrganizationId ?? undefined);

  const companyId = isSuper
    ? (opts.bodyCompanyId ?? opts.sessionCompanyId ?? undefined)
    : (opts.sessionCompanyId ?? opts.bodyCompanyId ?? undefined);

  if (!organizationId) {
    throw new Error("organizationId required (session or body for SUPER_ADMIN)");
  }
  if (!companyId) {
    throw new Error("companyId required (session or body for SUPER_ADMIN)");
  }

  // Non-super: reject body company that does not match session when both present
  if (
    !isSuper &&
    opts.sessionCompanyId &&
    opts.bodyCompanyId &&
    opts.bodyCompanyId !== opts.sessionCompanyId
  ) {
    throw new Error("Cross-company access denied");
  }

  return { organizationId, companyId };
}

export function assertFinancialCompanyAccess(opts: {
  role: Role;
  sessionCompanyId?: string | null;
  resourceCompanyId: string | null | undefined;
}): void {
  if (opts.role === "SUPER_ADMIN") return;
  if (!opts.resourceCompanyId) throw new Error("Resource has no company");
  if (opts.sessionCompanyId && opts.sessionCompanyId !== opts.resourceCompanyId) {
    throw new Error("Cross-company access denied");
  }
  if (!opts.sessionCompanyId) {
    // DIRECTOR / finance without company bind may operate org-wide read; writes still need care
    if (opts.role !== "DIRECTOR" && opts.role !== "FINANCE" && opts.role !== "FINANCE_MANAGER") {
      throw new Error("Company scope required");
    }
  }
}
