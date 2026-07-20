/**
 * Non-destructive DB audit for Prisma migration recovery.
 * Does not modify data. Never prints secrets.
 */
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(resolve(process.cwd(), ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

// Prefer DIRECT_URL for catalog (session mode)
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url } },
  log: ["error"],
});

async function q(sql) {
  return p.$queryRawUnsafe(sql);
}

try {
  let migrationsTable = null;
  try {
    migrationsTable = await q(`
      SELECT migration_name, finished_at IS NOT NULL AS finished,
             applied_steps_count, rolled_back_at IS NOT NULL AS rolled_back
      FROM "_prisma_migrations"
      ORDER BY migration_name
    `);
  } catch (e) {
    migrationsTable = { missing: true, error: String(e.message || e).slice(0, 200) };
  }

  const tables = await q(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('proqpay', 'public')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `);

  const enums = await q(`
    SELECT n.nspname AS schema_name, t.typname AS enum_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname IN ('proqpay', 'public')
      AND t.typtype = 'e'
    ORDER BY 1, 2
  `);

  let roleValues = [];
  try {
    roleValues = await q(`
      SELECT e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'proqpay' AND t.typname = 'Role'
      ORDER BY e.enumsortorder
    `);
  } catch {
    roleValues = [];
  }

  const expectedTables = [
    "companies",
    "employees",
    "payroll_periods",
    "payroll_lines",
    "payment_instructions",
    "payment_confirmations",
    "working_capital_requests",
    "invoices",
    "invoice_items",
    "invoice_sequences",
    "client_payments",
    "payment_allocations",
    "receivables",
    "working_capital_approvals",
    "working_capital_settlements",
    "funding_sources",
    "treasury_accounts",
    "cash_movements",
    "collection_activities",
    "financial_audits",
    "payroll_calculations",
    "payroll_calculation_items",
    "payroll_formulas",
    "payroll_formula_versions",
    "payroll_snapshots",
    "payroll_simulations",
    "payroll_validations",
    "payroll_approvals",
    "payroll_approval_steps",
    "payroll_revisions",
    "payroll_journals",
    "payroll_budgets",
    "client_billing_profiles",
  ];

  const tableSet = new Set(
    tables.map((t) => `${t.table_schema}.${t.table_name}`),
  );
  const proqpayTables = tables
    .filter((t) => t.table_schema === "proqpay")
    .map((t) => t.table_name);

  const present = [];
  const missing = [];
  for (const t of expectedTables) {
    if (tableSet.has(`proqpay.${t}`)) present.push(t);
    else missing.push(t);
  }

  const counts = {};
  for (const t of [
    "companies",
    "employees",
    "payroll_periods",
    "payroll_lines",
    "users",
    "invoices",
    "payroll_calculations",
  ]) {
    try {
      const r = await q(`SELECT count(*)::int AS c FROM proqpay."${t}"`);
      counts[t] = r[0]?.c ?? null;
    } catch {
      counts[t] = "MISSING";
    }
  }

  // component extended columns?
  let componentCols = [];
  try {
    componentCols = await q(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'proqpay' AND table_name = 'payroll_components'
      ORDER BY ordinal_position
    `);
  } catch {
    componentCols = [];
  }

  console.log(
    JSON.stringify(
      {
        prismaMigrations: migrationsTable,
        proqpayTableCount: proqpayTables.length,
        proqpayTables,
        publicTables: tables
          .filter((t) => t.table_schema === "public")
          .map((t) => t.table_name),
        enums: enums.map((e) => `${e.schema_name}.${e.enum_name}`),
        roleEnumValues: roleValues.map((r) => r.label),
        expectedPresent: present,
        expectedMissing: missing,
        rowCounts: counts,
        payrollComponentColumns: componentCols.map((c) => c.column_name),
      },
      null,
      2,
    ),
  );
} finally {
  await p.$disconnect();
}
