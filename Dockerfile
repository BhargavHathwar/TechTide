# ==========================================
# Multi-stage Dockerfile for TechTide
# ==========================================

# Stage 1: Build dependencies & native addons (better-sqlite3)
FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Lightweight Production Runtime
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Create directory for persistent SQLite data
RUN mkdir -p /data && chown -R node:node /data /app

# Copy dependencies and application source
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node feeds.js server.js ./
COPY --chown=node:node public ./public

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/technews.db

# Run as non-privileged user for security
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) process.exit(1); });"

CMD ["node", "server.js"]

