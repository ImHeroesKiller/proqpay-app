import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import {
  activateFormulaVersion,
  archiveFormula,
  createFormulaVersion,
  listFormulas,
} from "@/lib/payroll-engine/formula-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  const companyId =
    new URL(req.url).searchParams.get("companyId") ??
    gate.auth.companyId ??
    undefined;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  try {
    assertTenantOrThrow(gate.auth, companyId);
    const formulas = await listFormulas(companyId);
    return NextResponse.json({ formulas });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}

export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payroll",
    roles: PAYROLL_MUTATOR_ROLES.filter((r) => r !== "PAYROLL_OPERATOR"),
  });
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const companyId = body.companyId ?? gate.auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }
    assertTenantOrThrow(gate.auth, companyId);

    if (body.action === "activate" && body.versionId) {
      const version = await activateFormulaVersion(companyId, body.versionId);
      return NextResponse.json({ version });
    }
    if (body.action === "archive" && body.formulaId) {
      const formula = await archiveFormula(companyId, body.formulaId);
      return NextResponse.json({ formula });
    }

    if (!body.code || !body.name || !body.expression) {
      return NextResponse.json(
        { error: "code, name, expression required" },
        { status: 400 },
      );
    }
    const result = await createFormulaVersion({
      companyId,
      code: body.code,
      name: body.name,
      expression: body.expression,
      description: body.description,
      changeNote: body.changeNote,
      activate: body.activate === true,
      createdById: gate.auth.userId,
      effectiveFrom: body.effectiveFrom,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
