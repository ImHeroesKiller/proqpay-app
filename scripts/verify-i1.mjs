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
const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

console.log("=== AFTER_I1 ROW COUNTS ===");
for (const t of ["companies","employees","payroll_periods","payroll_lines","users"]) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.${t}`);
  console.log(t + "=" + r[0].n);
}
for (const t of ["sites","pay_cycles","payroll_groups","employee_payroll_assignments"]) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.${t}`);
  console.log(t + "=" + r[0].n);
}
const unbound = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.payroll_periods WHERE payroll_group_id IS NULL`);
console.log("periods_unbound=" + unbound[0].n);
const roles = await p.$queryRawUnsafe(`SELECT entity_kind::text, count(*)::int AS n FROM proqpay.companies GROUP BY 1`);
console.log("entity_kinds", roles);
const cols = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='proqpay' AND table_name='companies' AND column_name LIKE 'billing%' OR (table_schema='proqpay' AND table_name='companies' AND column_name='entity_kind') ORDER BY 1`);
console.log("company_cols", cols.map(c=>c.column_name).join(","));
await p.$disconnect();
