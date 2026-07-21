import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/types";
import { canMasterData } from "@/lib/master-data/permissions";
import { createSite, listSites, updateSite } from "@/lib/master-data/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canMasterData(session.user.role as Role, "MASTER_DATA_VIEW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const result = await listSites({
    companyId: url.searchParams.get("companyId") ?? undefined,
    projectId: url.searchParams.get("projectId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: (url.searchParams.get("status") as "ACTIVE" | "INACTIVE") || undefined,
    take: Number(url.searchParams.get("take") ?? 50),
    skip: Number(url.searchParams.get("skip") ?? 0),
  });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canMasterData(role, "MASTER_DATA_MANAGE")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const site = await createSite(body, {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "user",
      role,
    });
    return NextResponse.json({ site }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canMasterData(role, "MASTER_DATA_MANAGE")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, ...data } = body as { id: string } & Record<string, unknown>;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const site = await updateSite(id, data as never, {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "user",
      role,
    });
    return NextResponse.json({ site });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
