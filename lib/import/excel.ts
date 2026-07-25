import ExcelJS from "exceljs";
import { createHash } from "crypto";
import {
  getTemplate,
  type ImportTemplateDef,
  IMPORT_TEMPLATES,
} from "@/lib/import/templates";

export async function buildTemplateWorkbook(code: string): Promise<Buffer> {
  const tpl = getTemplate(code);
  if (!tpl) throw new Error("Template tidak ditemukan");

  const wb = new ExcelJS.Workbook();
  wb.creator = "ProQPay";
  wb.created = new Date();

  const instr = wb.addWorksheet("Instructions");
  instr.getColumn(1).width = 28;
  instr.getColumn(2).width = 72;
  instr.addRow(["ProQPay Bulk Import Template"]);
  instr.addRow(["Template", tpl.name]);
  instr.addRow(["Kode", tpl.code]);
  instr.addRow(["Versi", tpl.version]);
  instr.addRow(["Deskripsi", tpl.description]);
  instr.addRow([]);
  instr.addRow(["Petunjuk"]);
  instr.addRow([
    "1",
    "Isi sheet Data mulai baris 2. Jangan mengubah nama kolom header.",
  ]);
  instr.addRow(["2", "Kolom bertanda * wajib diisi."]);
  instr.addRow(["3", "Format tanggal: YYYY-MM-DD."]);
  instr.addRow(["4", "Format mata uang: angka tanpa pemisah ribuan (contoh 5000000)."]);
  instr.addRow([
    "5",
    "Field sensitif (NIK, rekening) hanya untuk keperluan payroll dan akan dimasking di UI.",
  ]);
  instr.addRow(["6", "Upload file ke Bulk Import Center, validasi, lalu konfirmasi commit."]);

  const data = wb.addWorksheet("Data");
  const headers = tpl.columns.map((c) => (c.required ? `${c.label} *` : c.label));
  data.addRow(headers);
  data.getRow(1).font = { bold: true };
  data.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B2A4A" },
  };
  data.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  tpl.columns.forEach((c, idx) => {
    data.getColumn(idx + 1).width = Math.max(16, c.label.length + 4);
  });
  data.addRow(tpl.columns.map((c) => c.example ?? ""));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function checksumBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export type ParsedRow = {
  rowNumber: number;
  data: Record<string, string>;
};

export async function parseImportExcel(
  buffer: Buffer,
  templateCode: string,
): Promise<{ template: ImportTemplateDef; rows: ParsedRow[] }> {
  const tpl = getTemplate(templateCode);
  if (!tpl) throw new Error("Template tidak ditemukan");

  const wb = new ExcelJS.Workbook();
  // exceljs accepts Buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const sheet =
    wb.getWorksheet("Data") ??
    wb.worksheets.find((s) => s.name.toLowerCase() !== "instructions") ??
    wb.worksheets[0];
  if (!sheet) throw new Error("Sheet Data tidak ditemukan");

  const headerRow = sheet.getRow(1);
  const headerMap = new Map<number, string>();
  headerRow.eachCell((cell, col) => {
    const raw = String(cell.value ?? "")
      .replace(/\s*\*$/, "")
      .trim();
    const colDef = tpl.columns.find(
      (c) => c.label.toLowerCase() === raw.toLowerCase() || c.key === raw,
    );
    if (colDef) headerMap.set(col, colDef.key);
  });

  // Ensure required columns present
  const presentKeys = new Set(headerMap.values());
  const missing = tpl.columns
    .filter((c) => c.required && !presentKeys.has(c.key))
    .map((c) => c.label);
  if (missing.length) {
    throw new Error(`Kolom wajib hilang: ${missing.join(", ")}`);
  }

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data: Record<string, string> = {};
    let empty = true;
    headerMap.forEach((key, col) => {
      const cell = row.getCell(col);
      let val = "";
      if (cell.value instanceof Date) {
        val = cell.value.toISOString().slice(0, 10);
      } else if (typeof cell.value === "object" && cell.value && "text" in cell.value) {
        val = String((cell.value as { text: string }).text ?? "");
      } else if (cell.value != null) {
        val = String(cell.value).trim();
      }
      if (val) empty = false;
      data[key] = val;
    });
    if (!empty) rows.push({ rowNumber, data });
  });

  return { template: tpl, rows };
}

export function listTemplates() {
  return IMPORT_TEMPLATES;
}
