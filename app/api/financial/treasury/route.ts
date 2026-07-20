import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canViewTreasury } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import {
  createTreasuryAccount,
  listTreasurySummary,
  postCashMovement,
} from "@/lib/financial/treasury-service";
import type { CashMovementType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canViewTreasury(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const orgId = new URL(req.url).searchParams.get("organizationId");
  if (!orgId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }
  const summary = await listTreasurySummary(orgId);
  return NextResponse.json(summary);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canViewTreasury(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    action: "create_account" | "post_movement";
    organizationId: string;
    companyId?: string;
    code?: string;
    name?: string;
    treasuryAccountId?: string;
    movementType?: CashMovementType;
    amount?: number;
    movementDate?: string;
  };

  const actor = {
    id: session.user.id,
    name: session.user.name ?? "User",
    role,
    companyId: session.user.companyId,
  };

  try {
    if (body.action === "create_account") {
      if (!body.code || !body.name) {
        return NextResponse.json({ error: "code and name required" }, { status: 400 });
      }
      const account = await createTreasuryAccount({
        organizationId: body.organizationId,
        companyId: body.companyId,
        code: body.code,
        name: body.name,
        actor,
      });
      return NextResponse.json({ account }, { status: 201 });
    }
    if (body.action === "post_movement") {
      if (!body.treasuryAccountId || !body.movementType || !body.amount || !body.movementDate) {
        return NextResponse.json({ error: "Missing movement fields" }, { status: 400 });
      }
      const movement = await postCashMovement({
        organizationId: body.organizationId,
        companyId: body.companyId,
        treasuryAccountId: body.treasuryAccountId,
        movementType: body.movementType,
        amount: body.amount,
        movementDate: new Date(body.movementDate),
        actor,
      });
      return NextResponse.json({ movement }, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Treasury failed" },
      { status: 400 },
    );
  }
}
