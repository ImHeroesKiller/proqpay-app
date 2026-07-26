import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePaymentInstruction } from "@/lib/payroll/actions";
import type { Role } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      periodId?: string;
      bankCode?: "BCA" | "MANDIRI" | "BRI" | "CUSTOM";
    };
    if (!body.periodId || !body.bankCode) {
      return NextResponse.json(
        { error: "periodId dan bankCode wajib diisi" },
        { status: 400 },
      );
    }
    const id = await generatePaymentInstruction(
      {
        userId: session.user.id,
        role: (session.user.role as Role) ?? "VIEWER",
        organizationId: session.user.organizationId,
        companyId: session.user.companyId,
      },
      body.periodId,
      body.bankCode,
    );
    return NextResponse.json({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    if (message.startsWith("BANK_TEMPLATE_REQUIRED:")) {
      return NextResponse.json(
        {
          error: "Template resmi bank belum tersimpan.",
          templateRequired: true,
          bankCode: message.split(":")[1],
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
