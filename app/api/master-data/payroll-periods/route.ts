import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/types";
import { canMasterData } from "@/lib/master-data/permissions";
import {
  createPayrollPeriodFromGroup,
  previewPeriodFromGroup,
} from "@/lib/master-data/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canMasterData(session.user.role as Role, "PAYROLL_PERIOD_CREATE")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const groupId = new URL(req.url).searchParams.get("payrollGroupId");
  if (!groupId) {
    return NextResponse.json({ error: "payrollGroupId required" }, { status: 400 });
  }
  try {
    const preview = await previewPeriodFromGroup(groupId);
    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canMasterData(role, "PAYROLL_PERIOD_CREATE")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const allowOverride = canMasterData(role, "PAYROLL_PERIOD_MANAGE");
    const result = await createPayrollPeriodFromGroup(
      body,
      {
        id: session.user.id,
        name: session.user.name ?? session.user.email ?? "user",
        role,
      },
      { allowDateOverride: allowOverride },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
