import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import {
  activateBpjsConfig,
  createBpjsConfigVersion,
  listBpjsConfigs,
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
    const configs = await listBpjsConfigs(companyId);
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
      const row = await activateBpjsConfig(gate.auth, body.id);
      return NextResponse.json({ config: row });
    }
    const companyId = body.companyId ?? gate.auth.companyId;
    if (!companyId || !body.name) {
      return NextResponse.json(
        { error: "companyId and name required" },
        { status: 400 },
      );
    }
    assertTenantOrThrow(gate.auth, companyId);
    const config = await createBpjsConfigVersion(gate.auth, {
      companyId,
      name: body.name,
      effectiveFrom: body.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      kesehatanEmployee: Number(body.kesehatanEmployee ?? 0.01),
      kesehatanEmployer: Number(body.kesehatanEmployer ?? 0.04),
      jhtEmployee: Number(body.jhtEmployee ?? 0.02),
      jhtEmployer: Number(body.jhtEmployer ?? 0.037),
      jkkEmployer: Number(body.jkkEmployer ?? 0.0024),
      jkmEmployer: Number(body.jkmEmployer ?? 0.003),
      jpEmployee: Number(body.jpEmployee ?? 0.01),
      jpEmployer: Number(body.jpEmployer ?? 0.02),
      maxWageKesehatan: Number(body.maxWageKesehatan ?? 12_000_000),
      maxWageJp: Number(body.maxWageJp ?? 10_547_400),
      changeNote: body.changeNote,
      activate: body.activate !== false,
    });
    return NextResponse.json({ config }, { status: 201 });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
