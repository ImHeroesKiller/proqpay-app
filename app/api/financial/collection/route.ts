import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { logCollectionActivity } from "@/lib/financial/collection-service";
import type { CollectionActivityType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "collection")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = session.user.companyId;
  const activities = await prisma.collectionActivity.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { performedAt: "desc" },
    take: 50,
    include: { notes: true },
  });
  return NextResponse.json({ activities });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canAccessModule(role, "collection")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    companyId?: string;
    invoiceId?: string;
    activityType: CollectionActivityType;
    summary: string;
    note?: string;
  };

  try {
    const companyId =
      role === "SUPER_ADMIN"
        ? (body.companyId ?? session.user.companyId)
        : (session.user.companyId ?? body.companyId);
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }
    if (
      role !== "SUPER_ADMIN" &&
      session.user.companyId &&
      body.companyId &&
      body.companyId !== session.user.companyId
    ) {
      return NextResponse.json({ error: "Cross-company denied" }, { status: 403 });
    }
    if (!body.activityType || !body.summary) {
      return NextResponse.json(
        { error: "activityType and summary required" },
        { status: 400 },
      );
    }
    const activity = await logCollectionActivity({
      companyId,
      invoiceId: body.invoiceId,
      activityType: body.activityType,
      summary: body.summary,
      note: body.note,
      actor: {
        id: session.user.id,
        name: session.user.name ?? "User",
        role,
        companyId: session.user.companyId,
      },
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Collection failed" },
      { status: 400 },
    );
  }
}
