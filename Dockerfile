# Phase 032 — Docker & deployment readiness.
#
# This image runs the LARO **API server** (server/index.ts) standalone — the
# same Express + tRPC backend the desktop app embeds. It does NOT ship the
# Electron desktop UI. Persistence is SQLite (better-sqlite3), which is compiled
# for Node in this image (no Electron rebuild).
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Build toolchain for the better-sqlite3 native module.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install deps (skip the electron-rebuild postinstall; rebuild for Node instead).
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3

# App source.
COPY tsconfig*.json ./
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
COPY scripts ./scripts

# Runtime config.
ENV PORT=3000
# Persist the SQLite DB and local evidence outside the container via volumes.
ENV DATABASE_URL=/data/laro-server.sqlite
ENV LOCAL_STORAGE_DIR=/data/uploads
VOLUME ["/data"]
EXPOSE 3000

# Container healthcheck hits the real health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tsx runs the TypeScript server entry directly (dev dep bundled in the image).
CMD ["npx", "tsx", "server/index.ts"]
