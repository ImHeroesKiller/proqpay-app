/**
 * Production builds must never deploy code against an unverified schema.
 * This intentionally does not try to repair migration history automatically.
 */
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (!url || url.includes("YOUR_") || url.includes("REGION") || url.length < 20) {
  if (isProduction) {
    console.error("DATABASE_URL missing or invalid in production build");
    process.exit(1);
  }
  console.warn("migrate-safe: skipped outside production without DATABASE_URL");
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  console.error("migrate-safe: migration failed; deployment stopped to prevent schema drift.");
  process.exit(1);
}
