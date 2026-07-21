import { NextResponse } from "next/server";
import {
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import { getPeriodPayrollSummary } from "@/lib/payroll-engine/audit-trail-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  try {
    const periodId = new URL(req.url).searchParams.get("payrollPeriodId");
    if (!periodId) {
      return NextResponse.json(
        { error: "payrollPeriodId required" },
        { status: 400 },
      );
    }
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }
    assertTenantOrThrow(gate.auth, period.companyId);
    const summary = await getPeriodPayrollSummary(periodId);
    return NextResponse.json(summary);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
