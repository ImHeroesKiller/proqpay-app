/**
 * Run prisma migrate deploy when DATABASE_URL is reachable.
 * Never print secrets. Fail the build in production if migrate fails.
 */
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (!url || url.includes("YOUR_") || url.includes("REGION") || url.length < 20) {
  if (isProd) {
    console.error("DATABASE_URL missing or invalid in production build");
    process.exit(1);
  }
  console.warn("migrate-safe: skip migrate (DATABASE_URL not configured for local)");
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  if (isProd) {
    process.exit(result.status ?? 1);
  }
  console.warn("migrate-safe: migrate failed locally; continuing build");
  process.exit(0);
}
