/**
 * Server-side performance instrumentation.
 * Enable with PERFORMANCE_LOGGING=true (never logs secrets or PII).
 */

export function isPerfLoggingEnabled(): boolean {
  return process.env.PERFORMANCE_LOGGING === "true";
}

export type PerfMeta = {
  route?: string;
  operation?: string;
  queryCount?: number;
  recordCount?: number;
  [key: string]: string | number | boolean | undefined;
};

export async function measure<T>(
  label: string,
  operation: () => Promise<T>,
  meta?: PerfMeta,
): Promise<T> {
  if (!isPerfLoggingEnabled()) {
    return operation();
  }

  const start = performance.now();
  try {
    return await operation();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    console.info("[PERF]", {
      label,
      durationMs,
      ...sanitizeMeta(meta),
    });
  }
}

export function perfLog(label: string, meta?: PerfMeta & { durationMs?: number }) {
  if (!isPerfLoggingEnabled()) return;
  console.info("[PERF]", {
    label,
    ...sanitizeMeta(meta),
  });
}

function sanitizeMeta(
  meta?: PerfMeta & { durationMs?: number },
): Record<string, string | number | boolean | undefined> {
  if (!meta) return {};
  const out: Record<string, string | number | boolean | undefined> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) continue;
    // Block accidental secret-like keys
    if (/password|token|secret|authorization|cookie|hash/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Simple query counter for a single request-scoped batch. */
export function createQueryCounter() {
  let count = 0;
  return {
    inc(n = 1) {
      count += n;
    },
    get() {
      return count;
    },
  };
}
