import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDashboardAlerts,
  getDashboardKpis,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { runProQIntelligence } from "@/lib/ai/proq-intelligence";
import { getPoolStatus } from "@/lib/ai/gemini-pool";
import type { SessionScope } from "@/lib/auth/scope";
import type { Role } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user.role as Role) ?? "VIEWER";
  const scope: SessionScope = {
    userId: session.user.id ?? "",
    role,
    companyId: session.user.companyId ?? null,
    organizationId: session.user.organizationId ?? null,
  };

  const [kpis, alerts, periods] = await Promise.all([
    getDashboardKpis(role, scope),
    getDashboardAlerts(scope),
    getPayrollPeriods(scope),
  ]);

  const intelligence = await runProQIntelligence({
    userName: session.user.name,
    kpis,
    alerts,
    periods,
  });

  return NextResponse.json({
    intelligence,
    pool: getPoolStatus(),
  });
}
