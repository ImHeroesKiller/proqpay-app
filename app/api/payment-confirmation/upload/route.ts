import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPaymentConfirmation } from "@/lib/data/confirmations";
import type { Role } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = await createPaymentConfirmation({
      scope: {
        userId: session.user.id,
        role: (session.user.role as Role) ?? "VIEWER",
        organizationId: session.user.organizationId,
        companyId: session.user.companyId,
      },
      paymentInstructionId: String(form.get("paymentInstructionId") ?? ""),
      paymentDate: String(form.get("paymentDate") ?? ""),
      paymentAmount: Number(form.get("paymentAmount") ?? 0),
      payerBank: String(form.get("payerBank") ?? ""),
      payerAccountName: String(form.get("payerAccountName") ?? ""),
      payerAccount: String(form.get("payerAccount") ?? ""),
      referenceNumber: String(form.get("referenceNumber") ?? ""),
      notes: String(form.get("notes") ?? "") || undefined,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBytes: buffer,
    });

    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
