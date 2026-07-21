import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import { submitPayrollForApproval } from "@/lib/payroll/actions";
import { prisma } from "@/lib/db";
import { assertTenantOrThrow } from "@/lib/auth/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as { periodId?: string };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: body.periodId },
    });
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }
    assertTenantOrThrow(gate.auth, period.companyId);
    if (!period.latestCalculationId) {
      return NextResponse.json(
        { error: "Run payroll calculation before submit for approval" },
        { status: 400 },
      );
    }

    await submitPayrollForApproval(gate.auth, body.periodId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
