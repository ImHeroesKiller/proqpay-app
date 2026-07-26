/**
 * ProQ AI — Gemini worker pool with round-robin, retry, timeout,
 * circuit breaker, and short response cache.
 *
 * Workers are loaded from env only (never hardcoded):
 * GEMINI_WORKER_1 … GEMINI_WORKER_5  (or gemini-worker-1 style aliases)
 * Fallback: GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY
 */

export type GeminiWorkerId =
  | "gemini-worker-1"
  | "gemini-worker-2"
  | "gemini-worker-3"
  | "gemini-worker-4"
  | "gemini-worker-5"
  | "gemini-flash-lite";

type WorkerConfig = {
  id: GeminiWorkerId;
  apiKey: string;
  model: string;
  isFallback?: boolean;
};

type CircuitState = {
  failures: number;
  openUntil: number;
};

export type GeminiGenerateResult = {
  text: string;
  workerId: GeminiWorkerId;
  model: string;
  cached: boolean;
  latencyMs: number;
};

const PRIMARY_MODEL =
  process.env.GEMINI_PRIMARY_MODEL?.trim() || "gemini-3.5-flash";
const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-3.1-flash-lite";
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 12000);
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 30_000;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000;

let rrIndex = 0;
const circuits = new Map<string, CircuitState>();
const cache = new Map<string, { expires: number; value: GeminiGenerateResult }>();
const failedLogs: { workerId: string; at: string; reason: string }[] = [];

function envKey(...names: string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

function loadWorkers(): WorkerConfig[] {
  const primary: WorkerConfig[] = [];
  for (let i = 1; i <= 5; i++) {
    const key = envKey(
      `GEMINI_WORKER_${i}`,
      `gemini-worker-${i}`,
      `GEMINI_WORKER_${i}_KEY`,
    );
    if (key) {
      primary.push({
        id: `gemini-worker-${i}` as GeminiWorkerId,
        apiKey: key,
        model: PRIMARY_MODEL,
      });
    }
  }

  const fallbackKey = envKey(
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_FALLBACK_KEY",
  );

  const workers = [...primary];
  if (fallbackKey) {
    workers.push({
      id: "gemini-flash-lite",
      apiKey: fallbackKey,
      model: FALLBACK_MODEL,
      isFallback: true,
    });
  } else if (primary.length === 0) {
    // No keys — empty pool; caller handles offline mode
  }

  return workers;
}

function isCircuitOpen(id: string): boolean {
  const c = circuits.get(id);
  if (!c) return false;
  if (Date.now() < c.openUntil) return true;
  if (c.openUntil > 0 && Date.now() >= c.openUntil) {
    circuits.set(id, { failures: 0, openUntil: 0 });
  }
  return false;
}

function recordFailure(id: string, reason: string) {
  const prev = circuits.get(id) ?? { failures: 0, openUntil: 0 };
  const failures = prev.failures + 1;
  const openUntil =
    failures >= CIRCUIT_THRESHOLD ? Date.now() + CIRCUIT_COOLDOWN_MS : 0;
  circuits.set(id, { failures, openUntil });
  failedLogs.push({
    workerId: id,
    at: new Date().toISOString(),
    reason: reason.slice(0, 200),
  });
  if (failedLogs.length > 50) failedLogs.shift();
}

function recordSuccess(id: string) {
  circuits.set(id, { failures: 0, openUntil: 0 });
}

function orderWorkers(workers: WorkerConfig[]): WorkerConfig[] {
  const primary = workers.filter((w) => !w.isFallback);
  const fallback = workers.filter((w) => w.isFallback);
  if (primary.length === 0) return fallback;

  const start = rrIndex % primary.length;
  rrIndex = (rrIndex + 1) % primary.length;
  const rotated = [...primary.slice(start), ...primary.slice(0, start)];
  return [...rotated, ...fallback];
}

async function callGemini(
  worker: WorkerConfig,
  prompt: string,
  system: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(worker.model)}:generateContent?key=${encodeURIComponent(worker.apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 180)}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    if (!text.trim()) throw new Error("Empty model response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export function getFailedWorkerLog() {
  return [...failedLogs];
}

export function getPoolStatus() {
  const workers = loadWorkers();
  return {
    workers: workers.map((w) => ({
      id: w.id,
      model: w.model,
      isFallback: !!w.isFallback,
      circuitOpen: isCircuitOpen(w.id),
    })),
    recentFailures: getFailedWorkerLog().slice(-10),
  };
}

/**
 * Generate text with round-robin primary workers → Flash Lite fallback.
 * Retries up to MAX_RETRIES per worker attempt cycle.
 */
export async function generateWithPool(options: {
  prompt: string;
  system: string;
  cacheKey?: string;
}): Promise<GeminiGenerateResult | null> {
  const { prompt, system, cacheKey } = options;
  const key = cacheKey ?? `${system.slice(0, 40)}::${prompt}`;

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return { ...hit.value, cached: true };
  }

  const workers = loadWorkers();
  if (workers.length === 0) return null;

  const ordered = orderWorkers(workers);
  const started = Date.now();
  let lastError = "";

  for (const worker of ordered) {
    if (isCircuitOpen(worker.id)) continue;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const text = await callGemini(worker, prompt, system);
        recordSuccess(worker.id);
        const result: GeminiGenerateResult = {
          text,
          workerId: worker.id,
          model: worker.model,
          cached: false,
          latencyMs: Date.now() - started,
        };
        cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: result });
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        recordFailure(worker.id, lastError);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
        }
      }
    }
  }

  recordFailure("pool", lastError || "all workers failed");
  return null;
}
