import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildBankInstructionFile } from "@/lib/payments/export-bank-file";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const pi = await prisma.paymentInstruction.findUnique({ where: { id } });
    if (!pi) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      session.user.role !== "SUPER_ADMIN" &&
      session.user.companyId &&
      pi.companyId !== session.user.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const file = await buildBankInstructionFile(id);
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${pi.instructionNumber}.${file.extension}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
