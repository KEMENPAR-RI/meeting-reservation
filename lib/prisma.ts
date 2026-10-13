import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// No connection is opened here; a missing DATABASE_URL fails on the first query, not at import/build time.
function createPrismaClient(): PrismaClient {
  // Small pool: each serverless instance holds its own connections
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse across HMR reloads in dev to avoid piling up client instances
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
