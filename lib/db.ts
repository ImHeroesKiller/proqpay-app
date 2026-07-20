import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildLogConfig(): Prisma.LogLevel[] | Prisma.LogDefinition[] {
  if (process.env.PERFORMANCE_LOGGING === "true") {
    return [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
    ];
  }
  if (process.env.NODE_ENV === "development") {
    return ["error", "warn"];
  }
  return ["error"];
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: buildLogConfig(),
  });

  if (process.env.PERFORMANCE_LOGGING === "true") {
    // Structured query timing only — never log parameter values (may contain PII).
    client.$on("query" as never, (e: { duration: number; query: string }) => {
      const q = typeof e.query === "string" ? e.query : "";
      // Strip quoted literals defensively
      const sanitized = q.replace(/'[^']*'/g, "'?'").slice(0, 200);
      console.info("[PERF]", {
        label: "prisma.query",
        durationMs: e.duration,
        queryPreview: sanitized,
      });
    });
  }

  return client;
}

/**
 * Always reuse a single PrismaClient per process.
 * Critical for serverless warm invocations (avoids reconnect storms).
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
