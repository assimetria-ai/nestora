# ─────────────────────────────────────────────────────────────────────────────
#  Assimetria Product Template — Root Dockerfile  (multi-stage, production-ready)
#
#  Produces a single image that:
#    1. Builds the React/Vite frontend (dist/)
#    2. Bundles the Node.js/Express backend
#    3. Serves static assets from the backend (or a separate nginx is preferred)
#
#  Typical usage
#    docker build -t product-template .
#    docker run -p 4000:4000 --env-file .env product-template
#
#  Build targets
#    --target server-deps   → only production server deps (CI cache layer)
#    --target client-build  → only Vite build (CI cache layer)
#    --target runner        → final production image (default)
# ─────────────────────────────────────────────────────────────────────────────

# ── Shared base ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ARG CACHEBUST=1
RUN apk add --no-cache tini postgresql-client

# ── Stage 1: server production dependencies ───────────────────────────────────
FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: client build ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client

# Manifests first → better layer caching
COPY client/package*.json ./
RUN npm ci --ignore-scripts

COPY client/ ./

# Accept API URL at build time; defaults to relative path (same host)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 3: final runner ─────────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Server production deps
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Server source
COPY server/src/ ./server/src/
COPY server/package*.json ./server/

# Built frontend assets (served by Express as static files or a CDN)
# Server looks for static files at server/src/../public = server/public
COPY --from=client-build /app/client/dist ./server/public

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/public

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/src/db/migrations/@system/start.js"]
