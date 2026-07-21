import { NextResponse } from "next/server";
import { requireApiAuth, tenantErrorResponse } from "@/lib/auth/api";
import {
  compareCalculations,
  listPeriodCalculations,
} from "@/lib/payroll-engine/compare-service";
import { prisma } from "@/lib/db";
import { assertTenantOrThrow } from "@/lib/auth/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireApiAuth({ module: "payroll" });
  if (!gate.ok) return gate.response;
  try {
    const url = new URL(req.url);
    const periodId = url.searchParams.get("payrollPeriodId");
    const a = url.searchParams.get("a");
    const b = url.searchParams.get("b");

    if (periodId && !a) {
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: periodId },
      });
      if (!period) {
        return NextResponse.json({ error: "Period not found" }, { status: 404 });
      }
      assertTenantOrThrow(gate.auth, period.companyId);
      const runs = await listPeriodCalculations(periodId);
      return NextResponse.json({ runs });
    }

    if (a && b) {
      const cmp = await compareCalculations(a, b);
      const calcA = await prisma.payrollCalculation.findUnique({
        where: { id: a },
      });
      if (calcA) assertTenantOrThrow(gate.auth, calcA.companyId);
      return NextResponse.json(cmp);
    }

    return NextResponse.json(
      { error: "payrollPeriodId or a&b calculation ids required" },
      { status: 400 },
    );
  } catch (e) {
    return tenantErrorResponse(e);
  }
}
