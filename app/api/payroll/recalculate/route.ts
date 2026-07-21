import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import { recalculatePayrollPeriod } from "@/lib/payroll/actions";

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
    const result = await recalculatePayrollPeriod(gate.auth, body.periodId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
