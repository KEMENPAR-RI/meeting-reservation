import { defineConfig } from "prisma/config";

// Prisma CLI does not auto-load env files; .env.local wins (no override), missing files are ignored.
try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env instead of env() so `prisma generate` works without a URL.
    // Prefer Neon's direct (unpooled) URL: migrate needs advisory locks, which break through PgBouncer.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
