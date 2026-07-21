import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import { prisma } from "@/lib/db";
import {
  verifyAndProject,
  verifyProjectionReadiness,
} from "@/lib/payroll-engine/projection-verify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET ?periodId=&calculationId= — verify readiness only
 * POST { periodId, calculationId?, verifyOnly? } — verify + project
 */
export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");
    const calculationId = url.searchParams.get("calculationId");
    if (!periodId || !calculationId) {
      return NextResponse.json(
        { error: "periodId and calculationId required" },
        { status: 400 },
      );
    }
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }
    assertTenantOrThrow(gate.auth, period.companyId);
    const verify = await verifyProjectionReadiness(
      gate.auth,
      periodId,
      calculationId,
    );
    return NextResponse.json(verify);
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
    const body = (await req.json()) as {
      periodId?: string;
      calculationId?: string;
      verifyOnly?: boolean;
    };
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

    const calculationId =
      body.calculationId ?? period.latestCalculationId ?? undefined;
    if (!calculationId) {
      return NextResponse.json(
        { error: "calculationId required (or run calculation first)" },
        { status: 400 },
      );
    }

    if (body.verifyOnly) {
      const verify = await verifyProjectionReadiness(
        gate.auth,
        body.periodId,
        calculationId,
      );
      return NextResponse.json(verify);
    }

    const out = await verifyAndProject(
      gate.auth,
      body.periodId,
      calculationId,
    );
    if (!out.projected) {
      return NextResponse.json(
        { error: "Projection verification failed", verify: out.verify },
        { status: 400 },
      );
    }
    return NextResponse.json(out);
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
