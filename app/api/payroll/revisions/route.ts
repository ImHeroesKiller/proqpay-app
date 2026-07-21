import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  createPayrollRevision,
  listRevisions,
} from "@/lib/payroll-engine/revision-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessModule(session.user.role as Role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const calculationId = new URL(req.url).searchParams.get("calculationId");
  if (!calculationId) {
    return NextResponse.json({ error: "calculationId required" }, { status: 400 });
  }
  const revisions = await listRevisions(calculationId);
  return NextResponse.json({ revisions });
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
    calculationId: string;
    reason: string;
  };
  try {
    const revision = await createPayrollRevision({
      calculationId: body.calculationId,
      reason: body.reason,
      createdById: session.user.id,
      createdByName: session.user.name,
    });
    return NextResponse.json({ revision }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Revision failed" },
      { status: 400 },
    );
  }
}
