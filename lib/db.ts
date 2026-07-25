import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    transactionOptions: {
      maxWait: 5_000,
      timeout: 10_000,
    },
  });

// Reuse one client inside every warm Node.js function instance. This avoids
// opening a fresh pool whenever a server component imports the database layer.
globalForPrisma.prisma = prisma;
