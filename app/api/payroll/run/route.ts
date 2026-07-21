import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import { runPeriodPayrollCalculation } from "@/lib/payroll/period-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Run engine calculation for a period (does not project unless projectImmediately). */
export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      periodId?: string;
      projectImmediately?: boolean;
      runReason?: string;
    };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    const result = await runPeriodPayrollCalculation(gate.auth, body.periodId, {
      projectImmediately: body.projectImmediately === true,
      runReason: body.runReason,
    });
    return NextResponse.json(result);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
