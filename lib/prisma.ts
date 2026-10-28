import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// No connection is opened here; missing DB_* vars fail on the first query, not at import/build time.
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    // MySQL 8 caching_sha2_password over a non-TLS docker bridge needs RSA key retrieval
    allowPublicKeyRetrieval: true,
    // UTC session so DATETIME columns (no TZ) and CURRENT_TIMESTAMP stay UTC
    timezone: "Z",
    // Small pool: 1GB VPS, single app instance
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse across HMR reloads in dev to avoid piling up client instances
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
