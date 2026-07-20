import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  runPayrollSimulation,
  type SimulationScenario,
} from "@/lib/payroll-engine/simulation-service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId =
    new URL(req.url).searchParams.get("companyId") ?? session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const simulations = await prisma.payrollSimulation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ simulations });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    companyId: string;
    name: string;
    scenario: SimulationScenario;
  };
  try {
    const sim = await runPayrollSimulation({
      ...body,
      createdById: session.user.id,
    });
    return NextResponse.json({ simulation: sim }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Simulate failed" },
      { status: 400 },
    );
  }
}
