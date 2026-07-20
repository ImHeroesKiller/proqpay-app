import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  createFormulaVersion,
  listFormulas,
} from "@/lib/payroll-engine/formula-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "payroll") || role === "CLIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId =
    new URL(req.url).searchParams.get("companyId") ?? session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const formulas = await listFormulas(companyId);
  return NextResponse.json({ formulas });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (
    !canAccessModule(role, "payroll") ||
    role === "CLIENT" ||
    role === "VIEWER" ||
    role === "PAYROLL_OPERATOR"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    companyId: string;
    code: string;
    name: string;
    expression: string;
    description?: string;
    activate?: boolean;
  };
  try {
    const result = await createFormulaVersion({
      ...body,
      createdById: session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
