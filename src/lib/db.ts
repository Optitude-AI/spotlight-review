import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy Prisma client. On Vercel, the SQLite DB file may not exist (ephemeral
 * filesystem). The client is created lazily so module import never crashes;
 * individual queries that fail are caught by try/catch in the API routes.
 */
function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query"],
  });
}

export const db =
  globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
