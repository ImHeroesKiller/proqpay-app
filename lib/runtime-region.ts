/**
 * Vercel Function region co-located with Supabase PostgreSQL (ap-southeast-2).
 *
 * Baseline A (historical): default / iad1 — high RTT to Sydney DB.
 * Candidate B: syd1 — compute next to the database.
 *
 * Applied via:
 * - `vercel.json` → `"regions": ["syd1"]` (project default for Node serverless)
 * - `export const preferredRegion = PREFERRED_COMPUTE_REGION` on app layouts/routes
 *
 * Do not move the database; only align compute.
 */
export const PREFERRED_COMPUTE_REGION = "syd1" as const;

/** Human-readable region notes for performance logs/docs (never secrets). */
export function runtimeRegionMeta(): {
  preferredRegion: string;
  vercelRegion?: string;
} {
  return {
    preferredRegion: PREFERRED_COMPUTE_REGION,
    vercelRegion: process.env.VERCEL_REGION,
  };
}
