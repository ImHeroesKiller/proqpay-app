import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  listComponents,
  upsertComponent,
} from "@/lib/payroll-engine/component-service";
import type { ComponentCalcMethod, PayrollComponentKind } from "@prisma/client";

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
  const components = await listComponents(companyId);
  return NextResponse.json({ components });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "payroll") || role === "CLIENT" || role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    companyId: string;
    code: string;
    name: string;
    kind: PayrollComponentKind;
    calcMethod?: ComponentCalcMethod;
    defaultAmount?: number;
    formulaExpression?: string;
    categoryCode?: string;
    calculationType?: string;
  };
  try {
    const component = await upsertComponent(body);
    return NextResponse.json({ component }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
