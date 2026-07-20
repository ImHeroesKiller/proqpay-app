import { createHash } from "crypto";

/** Deterministic UUID v5-style id from a stable namespace + name (for seed/demo). */
export function stableId(name: string): string {
  const hash = createHash("sha256")
    .update(`proqpay:${name}`)
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

export const IDS = {
  org: stableId("org:msg"),
  company: stableId("company:demo"),
  users: {
    siti: stableId("user:siti.rahayu@msg-os.com"),
    budi: stableId("user:budi.santoso@msg-os.com"),
    andi: stableId("user:andi.wijaya@msg-os.com"),
    dewi: stableId("user:dewi.lestari@msg-os.com"),
    rina: stableId("user:rina.kusuma@msg-os.com"),
    admin: stableId("user:admin@msg-os.com"),
  },
  periods: {
    jun2026: stableId("period:2026-06"),
    may2026: stableId("period:2026-05"),
    apr2026: stableId("period:2026-04"),
    jul2026: stableId("period:2026-07"),
  },
} as const;
