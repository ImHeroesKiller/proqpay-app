import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import { materializePayrollLines } from "@/lib/payroll/population";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      periodId?: string;
      replaceExisting?: boolean;
    };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    const result = await materializePayrollLines(gate.auth, body.periodId, {
      replaceExisting: body.replaceExisting,
    });
    return NextResponse.json(result);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
