import ExcelJS from "exceljs";
import { generateWithPool } from "@/lib/ai/gemini-pool";

export const BANK_OPTIONS = ["BCA", "MANDIRI", "BRI", "CUSTOM"] as const;
export type BankOption = (typeof BANK_OPTIONS)[number];

export const REQUIRED_BANK_FIELDS = [
  "beneficiary_account",
  "beneficiary_name",
  "amount",
] as const;

const OPTIONAL_BANK_FIELDS = [
  "beneficiary_bank_code",
  "beneficiary_email",
  "remark",
  "transaction_date",
  "currency",
  "reference",
] as const;

export type ParsedBankTemplate = {
  fileType: "CSV" | "XLSX";
  delimiter: string;
  sheetName?: string;
  columns: string[];
  mapping: Record<string, string>;
};

function parseCsvHeader(text: string) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter =
    (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  return {
    delimiter,
    columns: first
      .split(delimiter)
      .map((value) => value.replace(/^"|"$/g, "").trim())
      .filter(Boolean),
  };
}

async function readHeaders(
  buffer: Buffer,
  fileName: string,
): Promise<Omit<ParsedBankTemplate, "mapping">> {
  if (/\.csv$|\.txt$/i.test(fileName)) {
    const parsed = parseCsvHeader(buffer.toString("utf8"));
    return {
      fileType: "CSV",
      delimiter: parsed.delimiter,
      columns: parsed.columns,
    };
  }
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Sheet template bank tidak ditemukan");
  let columns: string[] = [];
  sheet.eachRow((row) => {
    if (columns.length) return;
    const values: string[] = [];
    row.eachCell((cell) => {
      const value = String(cell.value ?? "").trim();
      if (value) values.push(value);
    });
    if (values.length >= 2) columns = values;
  });
  return {
    fileType: "XLSX",
    delimiter: ",",
    sheetName: sheet.name,
    columns,
  };
}

function parseMapping(text: string, columns: string[]) {
  try {
    const value = JSON.parse(text) as { mapping?: Record<string, unknown> };
    const allowed = new Set([
      ...REQUIRED_BANK_FIELDS,
      ...OPTIONAL_BANK_FIELDS,
    ]);
    const mapping: Record<string, string> = {};
    for (const [field, column] of Object.entries(value.mapping ?? {})) {
      if (
        allowed.has(field as (typeof REQUIRED_BANK_FIELDS)[number]) &&
        typeof column === "string" &&
        columns.includes(column)
      ) {
        mapping[field] = column;
      }
    }
    return mapping;
  } catch {
    return {};
  }
}

export async function analyzeBankTemplate(
  buffer: Buffer,
  fileName: string,
  bankCode: BankOption,
): Promise<ParsedBankTemplate> {
  const parsed = await readHeaders(buffer, fileName);
  if (!parsed.columns.length) {
    throw new Error("Header template bank tidak terbaca");
  }
  const result = await generateWithPool({
    system: `Anda adalah IDA bank-file mapping assistant. Petakan field standar ke
header template resmi tanpa mengubah nama header. JSON:
{"mapping":{"beneficiary_account":"header","beneficiary_name":"header","amount":"header",
"beneficiary_bank_code":"header opsional","beneficiary_email":"header opsional",
"remark":"header opsional","transaction_date":"header opsional","currency":"header opsional",
"reference":"header opsional"}}`,
    prompt: JSON.stringify({ bankCode, headers: parsed.columns }),
  });
  const mapping = result?.text
    ? parseMapping(result.text, parsed.columns)
    : {};
  const missing = REQUIRED_BANK_FIELDS.filter((field) => !mapping[field]);
  if (missing.length) {
    throw new Error(
      `IDA belum dapat memetakan field wajib: ${missing.join(", ")}`,
    );
  }
  return { ...parsed, mapping };
}
