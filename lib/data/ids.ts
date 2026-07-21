import { createHash } from "crypto";

/** Deterministic UUID from stable namespace + name (seed/baseline). */
export function stableId(name: string): string {
  const hash = createHash("sha256")
    .update(`proqpay:baseline2026:${name}`)
    .digest("hex")
    .slice(0, 32);
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

/** Baseline 2026 entity IDs (must match prisma/seed-realistic.ts). */
export const IDS = {
  org: stableId("org:msg"),
  companies: {
    ate: stableId("company:ate"),
    internal: stableId("company:internal"),
    mls: stableId("company:mls"),
    qsg: stableId("company:qsg"),
    ogg: stableId("company:ogg"),
  },
  users: {
    siti: stableId("user:siti.rahayu@msg-os.com"),
    budi: stableId("user:budi.santoso@msg-os.com"),
    andi: stableId("user:andi.wijaya@msg-os.com"),
    dewi: stableId("user:dewi.lestari@msg-os.com"),
    rina: stableId("user:rina.kusuma@msg-os.com"),
    admin: stableId("user:admin@msg-os.com"),
  },
  periods: {
    ateJune2026: stableId("period:ate-2026-06"),
    ateJuly2026: stableId("period:ate-2026-07"),
    ateAugust2026: stableId("period:ate-2026-08"),
  },
} as const;
