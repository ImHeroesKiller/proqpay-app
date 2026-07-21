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
const label = process.argv[2] || "COUNTS";
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});
const tables = ["companies", "employees", "payroll_periods", "payroll_lines", "users"];
console.log("=== " + label + " ===");
for (const t of tables) {
  const r = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM proqpay.${t}`);
  console.log(t + "=" + r[0].n);
}
await p.$disconnect();
