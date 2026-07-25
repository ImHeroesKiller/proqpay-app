import type { ImportTemplateDef } from "@/lib/import/templates";
import type { ParsedRow } from "@/lib/import/excel";

export type RowValidation = {
  rowNumber: number;
  status: "VALID" | "WARNING" | "ERROR";
  errors: string[];
  warnings: string[];
  data: Record<string, string>;
};

const PTKP = new Set([
  "TK/0",
  "TK/1",
  "TK/2",
  "TK/3",
  "K/0",
  "K/1",
  "K/2",
  "K/3",
]);

function parseDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(v: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function validateRows(
  template: ImportTemplateDef,
  rows: ParsedRow[],
  ctx: {
    employeeCodes?: Set<string>;
    projectCodes?: Set<string>;
    existingEmployeeCodes?: Set<string>;
    bankAccounts?: Set<string>;
  } = {},
): RowValidation[] {
  const seenCodes = new Set<string>();
  const seenBanks = new Set<string>(ctx.bankAccounts ?? []);

  return rows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const d = row.data;

    for (const col of template.columns) {
      if (col.required && !String(d[col.key] ?? "").trim()) {
        errors.push(`${col.label} wajib diisi`);
      }
    }

    if (d.join_date && !parseDate(d.join_date)) errors.push("Tanggal masuk tidak valid");
    if (d.start_date && !parseDate(d.start_date)) errors.push("Tanggal mulai tidak valid");
    if (d.end_date && !parseDate(d.end_date)) errors.push("Tanggal selesai tidak valid");
    if (d.terminate_date && !parseDate(d.terminate_date)) {
      errors.push("Tanggal terminasi tidak valid");
    }
    if (d.effective_date && !parseDate(d.effective_date)) {
      errors.push("Tanggal efektif tidak valid");
    }

    if (d.start_date && d.end_date) {
      const a = parseDate(d.start_date);
      const b = parseDate(d.end_date);
      if (a && b && b < a) errors.push("Tanggal selesai sebelum tanggal mulai");
    }

    if (d.base_salary != null && d.base_salary !== "") {
      const m = parseMoney(d.base_salary);
      if (m == null) errors.push("Gaji pokok tidak valid");
      else if (m < 0) errors.push("Gaji pokok tidak boleh negatif");
      else if (m === 0) warnings.push("Gaji pokok bernilai 0");
    }

    if (d.amount != null && d.amount !== "") {
      const m = parseMoney(d.amount);
      if (m == null) errors.push("Nominal tidak valid");
      else if (m < 0) errors.push("Nominal tidak boleh negatif");
    }

    if (d.ptkp_status && !PTKP.has(d.ptkp_status.toUpperCase())) {
      errors.push("PTKP tidak valid (contoh TK/0, K/1)");
    }

    if (d.tax_method) {
      const tm = d.tax_method.toUpperCase();
      if (!["GROSS", "NET", "GROSS_UP"].includes(tm)) {
        errors.push("Metode pajak harus GROSS, NET, atau GROSS_UP");
      }
    }

    const code = d.employee_code?.trim();
    if (code) {
      if (template.code === "EMPLOYEE_MASTER") {
        if (seenCodes.has(code)) errors.push("Kode karyawan duplikat dalam file");
        seenCodes.add(code);
        if (ctx.existingEmployeeCodes?.has(code)) {
          errors.push("Kode karyawan sudah terdaftar");
        }
      } else if (
        ctx.existingEmployeeCodes &&
        ctx.existingEmployeeCodes.size > 0 &&
        !ctx.existingEmployeeCodes.has(code)
      ) {
        errors.push("Kode karyawan tidak ditemukan di master");
      }
    }

    if (d.project_code && ctx.projectCodes && ctx.projectCodes.size > 0) {
      if (!ctx.projectCodes.has(d.project_code)) {
        errors.push("Kode project tidak ditemukan");
      }
    }

    if (d.bank_account) {
      const key = d.bank_account.replace(/\s/g, "");
      if (seenBanks.has(key) && template.code === "BANK_ACCOUNT") {
        warnings.push("Nomor rekening mungkin duplikat");
      }
      seenBanks.add(key);
    }

    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      errors.push("Format email tidak valid");
    }

    const status: RowValidation["status"] =
      errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "VALID";

    return {
      rowNumber: row.rowNumber,
      status,
      errors,
      warnings,
      data: d,
    };
  });
}
