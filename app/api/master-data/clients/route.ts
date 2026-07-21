import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/types";
import { canMasterData } from "@/lib/master-data/permissions";
import {
  createClient,
  listClients,
  updateClient,
} from "@/lib/master-data/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role as Role;
  if (!canMasterData(role, "MASTER_DATA_VIEW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const result = await listClients({
    organizationId: session.user.organizationId ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
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
  const body = (await req.json()) as {
    organizationId?: string;
    name: string;
    legalName?: string;
    npwp?: string;
    billingName?: string;
    defaultCurrency?: string;
    paymentTermsDays?: number;
  };
  const organizationId =
    body.organizationId ?? session.user.organizationId ?? undefined;
  if (!organizationId || !body.name) {
    return NextResponse.json(
      { error: "organizationId and name required" },
      { status: 400 },
    );
  }
  try {
    const client = await createClient(
      { ...body, organizationId },
      {
        id: session.user.id,
        name: session.user.name ?? session.user.email ?? "user",
        role,
      },
    );
    return NextResponse.json({ client }, { status: 201 });
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
  const body = (await req.json()) as { id: string } & Record<string, unknown>;
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    const { id, ...data } = body;
    const client = await updateClient(id, data as never, {
      id: session.user.id,
      name: session.user.name ?? session.user.email ?? "user",
      role,
    });
    return NextResponse.json({ client });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
