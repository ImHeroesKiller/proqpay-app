import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
} from "@/lib/auth/api";
import {
  groupValidationsBySeverity,
  listValidations,
  resolveValidation,
  rerunValidation,
} from "@/lib/payroll-engine/validation-center";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const rows = await listValidations({
      calculationId: url.searchParams.get("calculationId") ?? undefined,
      payrollPeriodId: url.searchParams.get("payrollPeriodId") ?? undefined,
      severity: url.searchParams.get("severity") ?? undefined,
      resolutionStatus: url.searchParams.get("status") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      companyId: gate.auth.companyId ?? undefined,
    });
    return NextResponse.json({
      validations: rows,
      grouped: groupValidationsBySeverity(rows),
    });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_MUTATOR_ROLES,
  });
  if (!gate.ok) return gate.response;
  try {
    const body = await req.json();
    if (body.action === "resolve" && body.validationId && body.resolution) {
      const row = await resolveValidation(
        gate.auth,
        body.validationId,
        body.resolution,
        body.note,
      );
      return NextResponse.json({ validation: row });
    }
    if (body.action === "rerun" && body.calculationId) {
      const result = await rerunValidation(gate.auth, body.calculationId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
