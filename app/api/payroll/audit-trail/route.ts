import { NextResponse } from "next/server";
import {
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import { getEmployeePayrollAudit } from "@/lib/payroll-engine/audit-trail-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const payrollPeriodId = url.searchParams.get("payrollPeriodId");
    const employeeId = url.searchParams.get("employeeId");
    const calculationId = url.searchParams.get("calculationId") ?? undefined;
    if (!payrollPeriodId || !employeeId) {
      return NextResponse.json(
        { error: "payrollPeriodId and employeeId required" },
        { status: 400 },
      );
    }
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
    });
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }
    assertTenantOrThrow(gate.auth, period.companyId);
    const trail = await getEmployeePayrollAudit({
      payrollPeriodId,
      employeeId,
      calculationId,
    });
    return NextResponse.json(trail);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
