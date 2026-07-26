import { NextResponse } from "next/server";
import { saveBankFileTemplate } from "@/lib/payments/template-actions";
import type { BankOption } from "@/lib/payments/bank-template";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = (await request.json()) as {
    companyId?: string;
    bankCode?: BankOption;
    fileName?: string;
    base64?: string;
  };
  if (!input.companyId || !input.bankCode || !input.fileName || !input.base64) {
    return NextResponse.json(
      { error: "Data template belum lengkap" },
      { status: 400 },
    );
  }
  const result = await saveBankFileTemplate({
    companyId: input.companyId,
    bankCode: input.bankCode,
    fileName: input.fileName,
    base64: input.base64,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
