# ---- Build stage ----
# Debian "slim" (glibc + OpenSSL 3) — avoids the musl/OpenSSL issues that make
# Prisma's schema engine fail on Alpine.
FROM node:22-slim AS build
WORKDIR /app

# OpenSSL is required by the Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install deps (incl. dev) using the lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client, then compile the Nest app.
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# Drop dev dependencies for a lean runtime node_modules.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Run as the built-in non-root user (least privilege).
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/package.json ./package.json

USER node
EXPOSE 3000

# Apply pending migrations at boot, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
