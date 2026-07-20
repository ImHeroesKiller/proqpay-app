import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(resolve(process.cwd(), ".env.local"));
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

console.log("--- _prisma_migrations ---");
const migs = await p.$queryRawUnsafe(`
  SELECT migration_name, finished_at IS NOT NULL AS finished,
         rolled_back_at IS NOT NULL AS rolled_back, applied_steps_count
  FROM "_prisma_migrations" ORDER BY migration_name
`);
console.log(JSON.stringify(migs, null, 2));

const required = [
  "invoices","invoice_items","receivables","client_payments","treasury_accounts","cash_movements",
  "payroll_formulas","payroll_formula_versions","payroll_calculations","payroll_validations",
  "payroll_approvals","payroll_journals","payroll_budgets",
];
console.log("--- required tables (proqpay) ---");
const tables = await p.$queryRawUnsafe(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'proqpay' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);
const names = new Set(tables.map((t) => t.table_name));
for (const t of required) {
  console.log(t + ": " + (names.has(t) ? "EXISTS" : "MISSING"));
}

console.log("--- Role enum values ---");
const roles = await p.$queryRawUnsafe(`
  SELECT e.enumlabel AS label
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'proqpay' AND t.typname = 'Role'
  ORDER BY e.enumsortorder
`);
console.log(roles.map((r) => r.label).join(", "));
const need = ["FINANCE_MANAGER","FINANCE_STAFF","PAYROLL_MANAGER","CLIENT"];
for (const r of need) {
  const ok = roles.some((x) => x.label === r);
  console.log(r + ": " + (ok ? "PRESENT" : "MISSING"));
}

console.log("--- AFTER row counts ---");
const ops = ["companies","employees","payroll_periods","payroll_lines","users"];
for (const t of ops) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.${t}`);
  console.log(t + "=" + r[0].n);
}

console.log("--- new module row counts (expect 0) ---");
for (const t of ["invoices","payroll_calculations","receivables","payroll_formulas"]) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.${t}`);
  console.log(t + "=" + r[0].n);
}

// payroll_components new columns
const cols = await p.$queryRawUnsafe(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='proqpay' AND table_name='payroll_components'
    AND column_name IN ('category_code','calculation_type','bpjs_applicable','currency','is_system','is_editable','formula_expression')
  ORDER BY column_name
`);
console.log("--- payroll_components engine columns ---");
console.log(cols.map((c) => c.column_name).join(", "));

await p.$disconnect();
