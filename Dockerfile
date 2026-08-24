# ═══════════════════════════════════════════════════════════════════════════════
# APEXA OS — PRODUCTION MULTI-STAGE DOCKERFILE
# Node.js 20 Alpine with Non-Root Security & Next.js Standalone Optimization
# ═══════════════════════════════════════════════════════════════════════════════

# Stage 1: Base Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package management manifests
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Application Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js Build
RUN npm run build

# Stage 3: Minimal Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system user for zero-trust container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone application build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
