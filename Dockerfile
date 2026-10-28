# syntax=docker/dockerfile:1

# glibc base: Prisma schema-engine needs it (avoid alpine/musl).
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# postinstall runs `prisma generate`, so schema + config must exist before npm ci.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/lib/generated ./lib/generated
RUN npm run build

# Standalone output has no Prisma CLI; keep it isolated from the traced node_modules.
FROM base AS migrate
WORKDIR /migrate
# Dedicated lockfile pins prisma@7.10.1 and its transitive deps.
COPY docker/migrate/package.json docker/migrate/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8282
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=migrate /migrate /migrate
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# Files stay root-owned (read-only for node); only the Next cache dir is writable.
RUN chmod 755 /usr/local/bin/entrypoint.sh \
  && mkdir -p /app/.next/cache \
  && chown node:node /app/.next/cache
USER node
EXPOSE 8282
HEALTHCHECK --interval=60s --timeout=10s --retries=3 --start-period=60s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8282)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
