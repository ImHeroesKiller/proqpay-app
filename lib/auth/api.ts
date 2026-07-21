import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canAccessModule,
  type AppModule,
} from "@/lib/auth/permissions";
import {
  assertCompanyAccess,
  type SessionScope,
} from "@/lib/auth/scope";
import type { Role } from "@/types";

export type ApiAuth = SessionScope & {
  name: string;
  email?: string | null;
};

export async function requireApiAuth(opts?: {
  module?: AppModule;
  roles?: Role[];
  denyRoles?: Role[];
}): Promise<{ ok: true; auth: ApiAuth } | { ok: false; response: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const role = (session.user.role as Role) ?? "VIEWER";
  if (opts?.module && !canAccessModule(role, opts.module)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (opts?.roles && !opts.roles.includes(role) && role !== "SUPER_ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  if (opts?.denyRoles?.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    auth: {
      userId: session.user.id,
      role,
      organizationId: session.user.organizationId,
      companyId: session.user.companyId,
      name: session.user.name ?? session.user.email ?? "User",
      email: session.user.email,
    },
  };
}

export function assertTenantOrThrow(
  auth: SessionScope,
  resourceCompanyId: string | null | undefined,
): void {
  if (!assertCompanyAccess(auth, resourceCompanyId)) {
    throw new Error("Cross-company access denied");
  }
}

export function tenantErrorResponse(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "Request failed";
  const status =
    msg.includes("denied") || msg.includes("Forbidden") || msg.includes("authorized")
      ? 403
      : 400;
  return NextResponse.json({ error: msg }, { status });
}

/** Roles that may mutate payroll operational state. */
export const PAYROLL_MUTATOR_ROLES: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "PAYROLL_OPERATOR",
  "DIRECTOR",
];

export const PAYROLL_APPROVER_ROLES: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "FINANCE",
  "FINANCE_MANAGER",
  "DIRECTOR",
  "APPROVER",
];

export const PAYROLL_LOCK_ROLES: Role[] = [
  "SUPER_ADMIN",
  "PAYROLL_ADMIN",
  "PAYROLL_MANAGER",
  "DIRECTOR",
];

export const ATTENDANCE_MUTATOR_ROLES: Role[] = [
  ...PAYROLL_MUTATOR_ROLES,
  "HR",
];
