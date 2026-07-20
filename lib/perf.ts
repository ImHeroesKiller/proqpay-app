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
  requestId?: string;
  cacheStatus?: string;
  coldStart?: boolean;
  region?: string;
  [key: string]: string | number | boolean | undefined;
};

/** Short non-PII request correlation id for structured [PERF] lines. */
export function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function runtimeExtras(): Pick<PerfMeta, "region"> {
  const region = process.env.VERCEL_REGION;
  return region ? { region } : {};
}

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
      ...runtimeExtras(),
      ...sanitizeMeta(meta),
    });
  }
}

export function perfLog(label: string, meta?: PerfMeta & { durationMs?: number }) {
  if (!isPerfLoggingEnabled()) return;
  console.info("[PERF]", {
    label,
    ...runtimeExtras(),
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
    if (/password|token|secret|authorization|cookie|hash|database_url/i.test(k))
      continue;
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
