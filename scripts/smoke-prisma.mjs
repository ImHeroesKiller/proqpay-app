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
console.log("=== PHASE 8 Prisma smoke (read paths) ===");
const users = await p.user.findMany({ take: 3, select: { id: true, email: true, role: true } });
console.log("users.findMany ok count=", users.length, "roles=", users.map(u => u.role).join(","));
const companies = await p.company.findMany({ take: 5, select: { id: true, name: true } });
console.log("companies.findMany ok count=", companies.length);
const periods = await p.payrollPeriod.findMany({
  take: 5,
  select: { id: true, status: true, companyId: true },
  orderBy: { createdAt: "desc" },
});
console.log("payrollPeriod.findMany ok count=", periods.length);
const lines = await p.payrollLine.count();
console.log("payrollLine.count ok n=", lines);
// new models empty but queryable
const inv = await p.invoice.count();
const calc = await p.payrollCalculation.count();
console.log("invoice.count ok n=", inv);
console.log("payrollCalculation.count ok n=", calc);
// Role enum assignment still works for existing roles
const adminish = await p.user.count({ where: { role: { in: ["SUPER_ADMIN", "PAYROLL_ADMIN", "FINANCE"] } } });
console.log("existing roles still queryable count=", adminish);
await p.$disconnect();
console.log("SMOKE_PRISMA_OK");
