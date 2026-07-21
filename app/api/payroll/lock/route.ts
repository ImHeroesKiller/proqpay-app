import { NextResponse } from "next/server";
import {
  PAYROLL_LOCK_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import { lockPayrollPeriod, unlockPayrollPeriod } from "@/lib/payroll/lock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_LOCK_ROLES,
  });
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      periodId?: string;
      action?: "lock" | "unlock";
    };
    if (!body.periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }
    if (body.action === "unlock") {
      if (
        gate.auth.role !== "SUPER_ADMIN" &&
        gate.auth.role !== "DIRECTOR" &&
        gate.auth.role !== "PAYROLL_MANAGER"
      ) {
        return NextResponse.json(
          { error: "Unlock requires PAYROLL_MANAGER, DIRECTOR, or SUPER_ADMIN" },
          { status: 403 },
        );
      }
      const result = await unlockPayrollPeriod(gate.auth, body.periodId);
      return NextResponse.json(result);
    }
    const result = await lockPayrollPeriod(gate.auth, body.periodId);
    return NextResponse.json(result);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
