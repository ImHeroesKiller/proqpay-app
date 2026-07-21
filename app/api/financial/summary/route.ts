import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { getFinancialCoreSummary } from "@/lib/financial/summary";

export const dynamic = "force-dynamic";

/** Dashboard contract endpoint — empty-safe financial aggregates. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (
    !canAccessModule(role, "dashboard") &&
    !canAccessModule(role, "invoices")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const summary = await getFinancialCoreSummary({
    organizationId: sp.get("organizationId") ?? session.user.organizationId,
    companyId: sp.get("companyId") ?? session.user.companyId,
  });

  return NextResponse.json(summary);
}
