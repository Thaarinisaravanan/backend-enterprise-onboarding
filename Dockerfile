# ──────────────────────────────────────────────
# Stage 1: Build
# Installs all dependencies and compiles TypeScript
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Compile TypeScript
RUN pnpm build

# ──────────────────────────────────────────────
# Stage 2: Production
# Only the compiled output — no source, no dev deps
# ──────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install pnpm for production install
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod && \
    pnpm prisma:generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Set file ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health || exit 1

EXPOSE ${PORT:-3000}

CMD ["node", "dist/main"]
