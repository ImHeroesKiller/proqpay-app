import { generateWithPool } from "@/lib/ai/gemini-pool";
import type { ImportTemplateDef } from "@/lib/import/templates";

const COMMON_ALIASES: Record<string, string[]> = {
  employee_code: ["nik karyawan", "kode pegawai", "employee id", "employee no", "nik"],
  name: ["nama karyawan", "employee name", "nama pegawai", "full name"],
  email: ["email karyawan", "email address", "surel"],
  phone: ["no hp", "nomor hp", "mobile", "phone number", "telepon"],
  department: ["departemen", "divisi", "department name", "unit kerja"],
  position: ["jabatan", "job title", "posisi"],
  join_date: ["tanggal masuk", "hire date", "joining date", "tanggal bergabung"],
  base_salary: ["gaji pokok", "basic salary", "salary", "upah pokok"],
  bank_name: ["nama bank", "bank", "beneficiary bank"],
  bank_account: ["nomor rekening", "no rekening", "account number", "rekening"],
  tax_status: ["status pajak", "ptkp", "ptkp status"],
  bpjs_number: ["nomor bpjs", "no bpjs", "bpjs"],
  npwp: ["nomor npwp", "no npwp"],
  client_code: ["kode client", "client", "klien", "nama client", "client name"],
  project_code: ["kode project", "project", "proyek", "project id"],
  payroll_group_code: ["payroll group", "grup payroll", "kode payroll group"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[_./()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type IdaHeaderAnalysis = {
  mapping: Record<string, string>;
  summary: string;
  source: "deterministic" | "llm";
};

function deterministicMapping(headers: string[], template: ImportTemplateDef) {
  const mapping: Record<string, string> = {};
  const targets = new Set(template.columns.map((column) => column.key));
  for (const header of headers) {
    const value = normalize(header);
    const direct = template.columns.find(
      (column) =>
        normalize(column.key) === value || normalize(column.label) === value,
    );
    if (direct) {
      mapping[header] = direct.key;
      continue;
    }
    const alias = Object.entries(COMMON_ALIASES).find(
      ([key, values]) =>
        targets.has(key) && values.some((item) => normalize(item) === value),
    );
    if (alias) mapping[header] = alias[0];
  }
  return mapping;
}

function parseLlmMapping(
  text: string,
  headers: string[],
  template: ImportTemplateDef,
) {
  try {
    const parsed = JSON.parse(text) as {
      mapping?: Record<string, unknown>;
      summary?: unknown;
    };
    if (!parsed.mapping || typeof parsed.mapping !== "object") return null;
    const headerSet = new Set(headers);
    const targetSet = new Set(template.columns.map((column) => column.key));
    const mapping: Record<string, string> = {};
    for (const [source, target] of Object.entries(parsed.mapping)) {
      if (
        headerSet.has(source) &&
        typeof target === "string" &&
        targetSet.has(target)
      ) {
        mapping[source] = target;
      }
    }
    return {
      mapping,
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 800)
          : "IDA menyelaraskan kolom dengan template payroll.",
    };
  } catch {
    return null;
  }
}

export async function analyzeImportHeaders(
  headers: string[],
  template: ImportTemplateDef,
): Promise<IdaHeaderAnalysis> {
  const deterministic = deterministicMapping(headers, template);
  const required = template.columns
    .filter((column) => column.required)
    .map((column) => column.key);
  const missing = required.filter(
    (key) => !Object.values(deterministic).includes(key),
  );
  if (missing.length === 0) {
    return {
      mapping: deterministic,
      summary:
        "IDA mengenali seluruh kolom minimum payroll. Data tetap melewati validasi client, project, rekening, pajak, dan nominal.",
      source: "deterministic",
    };
  }

  const result = await generateWithPool({
    system: `Anda adalah IDA data-mapping assistant. Petakan nama header sumber ke field
template yang diizinkan. Jangan membuat field baru. Jangan menebak nilai data.
Keluarkan JSON: {"mapping":{"header asli":"target_key"},"summary":"ringkasan"}.`,
    prompt: JSON.stringify({
      sourceHeaders: headers,
      allowedTargets: template.columns.map((column) => ({
        key: column.key,
        label: column.label,
        required: column.required,
      })),
    }),
  });
  const llm = result?.text
    ? parseLlmMapping(result.text, headers, template)
    : null;
  if (!llm) {
    return {
      mapping: deterministic,
      summary: `IDA belum dapat memastikan kolom: ${missing.join(", ")}. Lengkapi mapping sebelum commit.`,
      source: "deterministic",
    };
  }
  return {
    mapping: { ...deterministic, ...llm.mapping },
    summary: llm.summary,
    source: "llm",
  };
}
