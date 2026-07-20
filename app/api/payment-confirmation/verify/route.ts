import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyPaymentConfirmation } from "@/lib/data/confirmations";
import type { Role } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      confirmationId?: string;
      decision?: "VERIFIED" | "REJECTED" | "NEED_REVISION";
      reason?: string;
    };

    if (!body.confirmationId || !body.decision) {
      return NextResponse.json(
        { error: "confirmationId and decision are required" },
        { status: 400 },
      );
    }

    await verifyPaymentConfirmation({
      scope: {
        userId: session.user.id,
        role: (session.user.role as Role) ?? "VIEWER",
        organizationId: session.user.organizationId,
        companyId: session.user.companyId,
      },
      confirmationId: body.confirmationId,
      decision: body.decision,
      reason: body.reason,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
