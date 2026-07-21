import { NextResponse } from "next/server";
import {
  PAYROLL_MUTATOR_ROLES,
  requireApiAuth,
  tenantErrorResponse,
  assertTenantOrThrow,
} from "@/lib/auth/api";
import { createInstruction } from "@/lib/payout/instruction-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compat route — creates DRAFT PI (I2-A). Does NOT auto-approve.
 * Prefer POST /api/payout/instructions.
 */
export async function POST(req: Request) {
  const gate = await requireApiAuth({
    module: "payment_instructions",
    roles: PAYROLL_MUTATOR_ROLES,
  });
  if (!gate.ok) {
    const alt = await requireApiAuth({
      module: "payroll",
      roles: PAYROLL_MUTATOR_ROLES,
    });
    if (!alt.ok) return gate.response;
    return run(alt.auth, req);
  }
  return run(gate.auth, req);
}

async function run(
  auth: {
    userId: string;
    role: import("@/types").Role;
    organizationId?: string | null;
    companyId?: string | null;
    name?: string;
  },
  req: Request,
) {
  try {
    const body = (await req.json()) as {
      periodId?: string;
      idempotencyKey?: string;
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
    assertTenantOrThrow(auth, period.companyId);
    const result = await createInstruction(auth, {
      periodId: body.periodId,
      idempotencyKey: body.idempotencyKey ?? null,
    });
    return NextResponse.json({
      id: result.instruction.id,
      instruction: result.instruction,
      requiresApproval: true,
      idempotent: result.idempotent,
    });
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
