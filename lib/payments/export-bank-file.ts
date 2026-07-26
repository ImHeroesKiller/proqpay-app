import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",;\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function buildBankInstructionFile(instructionId: string) {
  const instruction = await prisma.paymentInstruction.findUnique({
    where: { id: instructionId },
    include: {
      bankTemplate: true,
      payrollPeriod: true,
      items: {
        include: {
          employee: {
            select: {
              bankAccount: true,
              bankName: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!instruction?.bankTemplate) {
    throw new Error("Template bank aktif belum tersedia");
  }
  const template = instruction.bankTemplate;
  const columns = template.columnsJson as string[];
  const mapping = template.mappingJson as Record<string, string>;
  const inverse = new Map(
    Object.entries(mapping).map(([field, column]) => [column, field]),
  );
  const rows = instruction.items.map((item) => {
    const values: Record<string, string | number> = {
      beneficiary_account: item.employee?.bankAccount ?? "",
      beneficiary_name: item.recipientName,
      amount: Number(item.amount).toFixed(2),
      beneficiary_bank_code: item.employee?.bankName ?? item.bankCode ?? "",
      beneficiary_email: item.employee?.email ?? "",
      remark: `Payroll ${instruction.payrollPeriod.name}`,
      transaction_date: formatDate(instruction.payrollPeriod.payDate),
      currency: instruction.currency,
      reference: item.externalReference ?? instruction.instructionNumber,
    };
    return columns.map((column) => values[inverse.get(column) ?? ""] ?? "");
  });

  if (template.fileType === "XLSX") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(template.sheetName || "Data");
    sheet.addRow(columns);
    for (const row of rows) sheet.addRow(row);
    const value = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(value),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
    };
  }

  const delimiter = template.delimiter || ",";
  const content = [
    columns.map((value) => csvCell(value)).join(delimiter),
    ...rows.map((row) =>
      row.map((value) => csvCell(value)).join(delimiter),
    ),
  ].join("\r\n");
  return {
    buffer: Buffer.from(content, "utf8"),
    contentType: "text/csv; charset=utf-8",
    extension: delimiter === ";" ? "txt" : "csv",
  };
}
