import { defineConfig } from "prisma/config";

// Prisma CLI does not auto-load env files; .env.local wins (no override), missing files are ignored.
try {
  process.loadEnvFile(".env");
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

// Compose the URL only when DB_* is set, so `prisma generate` and the Docker build work without a DB.
function databaseUrl(): string | undefined {
  const { DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD } =
    process.env;
  if (!DB_HOST || !DB_DATABASE || !DB_USERNAME) return undefined;
  const user = encodeURIComponent(DB_USERNAME);
  const pass = DB_PASSWORD ? `:${encodeURIComponent(DB_PASSWORD)}` : "";
  return `mysql://${user}${pass}@${DB_HOST}:${DB_PORT || "3306"}/${encodeURIComponent(DB_DATABASE)}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});
