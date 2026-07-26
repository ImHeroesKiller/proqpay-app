import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const scope = await requireSession();
  const notifications = await prisma.appNotification.findMany({
    where: { userId: scope.userId }, orderBy: { createdAt: "desc" }, take: 20,
    select: { id: true, title: true, body: true, entity: true, entityId: true, readAt: true, createdAt: true },
  });
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const scope = await requireSession();
  await prisma.appNotification.updateMany({ where: { userId: scope.userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
