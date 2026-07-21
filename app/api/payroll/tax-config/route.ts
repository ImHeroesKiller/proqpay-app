import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import {
  activateTaxConfig,
  createTaxConfigVersion,
  listTaxConfigs,
} from "@/lib/payroll-engine/statutory-config-service";

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
    const configs = await listTaxConfigs(companyId);
    return NextResponse.json({ configs });
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
    if (body.action === "activate" && body.id) {
      const row = await activateTaxConfig(gate.auth, body.id);
      return NextResponse.json({ config: row });
    }
    const companyId = body.companyId ?? gate.auth.companyId;
    if (!companyId || !body.name || body.defaultTerRate == null) {
      return NextResponse.json(
        { error: "companyId, name, defaultTerRate required" },
        { status: 400 },
      );
    }
    assertTenantOrThrow(gate.auth, companyId);
    const config = await createTaxConfigVersion(gate.auth, {
      companyId,
      name: body.name,
      method: body.method,
      defaultTerRate: Number(body.defaultTerRate),
      nonNpwpSurcharge:
        body.nonNpwpSurcharge != null
          ? Number(body.nonNpwpSurcharge)
          : undefined,
      effectiveFrom: body.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      ptkpJson: body.ptkpJson,
      rulesJson: body.rulesJson,
      changeNote: body.changeNote,
      activate: body.activate !== false,
    });
    return NextResponse.json({ config }, { status: 201 });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
