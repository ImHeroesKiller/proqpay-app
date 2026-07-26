"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import {
  analyzeBankTemplate,
  BANK_OPTIONS,
  type BankOption,
} from "@/lib/payments/bank-template";

export async function saveBankFileTemplate(input: {
  companyId: string;
  bankCode: BankOption;
  fileName: string;
  base64: string;
}) {
  const scope = await requireSession();
  if (!BANK_OPTIONS.includes(input.bankCode)) {
    return { ok: false as const, error: "Bank tidak didukung" };
  }
  if (
    scope.role !== "SUPER_ADMIN" &&
    scope.role !== "DIRECTOR" &&
    scope.companyId !== input.companyId
  ) {
    return { ok: false as const, error: "Tidak berwenang untuk client ini" };
  }
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { id: true },
  });
  if (!company) return { ok: false as const, error: "Client tidak ditemukan" };

  try {
    const parsed = await analyzeBankTemplate(
      Buffer.from(input.base64, "base64"),
      input.fileName,
      input.bankCode,
    );
    const latest = await prisma.bankFileTemplate.findFirst({
      where: { companyId: input.companyId, bankCode: input.bankCode },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const id = randomUUID();
    await prisma.$transaction([
      prisma.bankFileTemplate.updateMany({
        where: {
          companyId: input.companyId,
          bankCode: input.bankCode,
          isActive: true,
        },
        data: { isActive: false },
      }),
      prisma.bankFileTemplate.create({
        data: {
          id,
          companyId: input.companyId,
          bankCode: input.bankCode,
          name: input.fileName,
          version: (latest?.version ?? 0) + 1,
          fileType: parsed.fileType,
          delimiter: parsed.delimiter,
          sheetName: parsed.sheetName,
          columnsJson: parsed.columns,
          mappingJson: parsed.mapping,
          createdBy: scope.userId,
        },
      }),
    ]);
    return { ok: true as const, templateId: id };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Template bank gagal dianalisis",
    };
  }
}
