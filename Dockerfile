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

# NEXT_PUBLIC_* values are embedded into the browser bundle at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

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

# postbuild has already packed public and .next/static into standalone output.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
