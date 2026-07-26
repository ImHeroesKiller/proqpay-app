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

// If a previous deploy left a failed migration, mark it rolled back then re-apply.
// Safe only for additive IF NOT EXISTS migrations in this project.
const deploy = () =>
  spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
  });

let result = deploy();
if (result.status !== 0) {
  console.error("migrate-safe: migrate deploy failed; refusing to build with an unsynchronized database.");
  process.exit(1);
}
