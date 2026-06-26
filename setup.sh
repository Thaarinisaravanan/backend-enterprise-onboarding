#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# setup.sh — Enterprise Onboarding local environment bootstrap
# Run once after cloning: bash setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
section() { echo -e "\n${GREEN}══════════════════════════════════════${NC}"; echo -e "${GREEN} $*${NC}"; echo -e "${GREEN}══════════════════════════════════════${NC}"; }

# ──────────────────────────────────────────────
# 1. Check prerequisites
# ──────────────────────────────────────────────
section "Checking prerequisites"

check_command() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is required but not installed. $2"
  fi
  info "$1 found: $(command -v "$1")"
}

check_command nvm   "Install via: https://github.com/nvm-sh/nvm"
check_command node  "Run: nvm install --lts && nvm use --lts"
check_command pnpm  "Run: corepack enable && corepack prepare pnpm@latest --activate"
check_command docker "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
check_command git   "Install git: https://git-scm.com"

NODE_VERSION=$(node --version)
info "Node version: $NODE_VERSION"

REQUIRED_MAJOR=20
ACTUAL_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$ACTUAL_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  warn "Node $REQUIRED_MAJOR+ recommended. Current: $NODE_VERSION"
  warn "Run: nvm install $REQUIRED_MAJOR && nvm use $REQUIRED_MAJOR"
fi

# ──────────────────────────────────────────────
# 2. Install dependencies
# ──────────────────────────────────────────────
section "Installing dependencies"
pnpm install
info "Dependencies installed"

# ──────────────────────────────────────────────
# 3. Set up environment file
# ──────────────────────────────────────────────
section "Setting up environment"
if [ ! -f .env ]; then
  cp .env.example .env
  info ".env created from .env.example"
  warn "Open .env and set JWT_SECRET to a long random string before starting the app"
else
  info ".env already exists — skipping"
fi

# ──────────────────────────────────────────────
# 4. Install git hooks (commitlint + husky)
# ──────────────────────────────────────────────
section "Installing git hooks"
if ! pnpm list --depth=0 | grep -q husky 2>/dev/null; then
  pnpm add -D husky @commitlint/cli @commitlint/config-conventional
fi

pnpm exec husky init 2>/dev/null || true

# commit-msg hook
cat > .husky/commit-msg << 'EOF'
#!/bin/sh
pnpm exec commitlint --edit "$1"
EOF
chmod +x .husky/commit-msg

# pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
pnpm lint:check
EOF
chmod +x .husky/pre-commit

info "Git hooks installed (commitlint + lint on pre-commit)"

# ──────────────────────────────────────────────
# 5. Start infrastructure with Docker
# ──────────────────────────────────────────────
section "Starting Docker infrastructure"
if docker info &>/dev/null; then
  docker compose up -d postgres redis
  info "PostgreSQL and Redis started"
  info "Waiting for PostgreSQL to be ready..."
  sleep 5
else
  warn "Docker not running — skipping infrastructure start"
  warn "Start manually: docker compose up -d postgres redis"
fi

# ──────────────────────────────────────────────
# 6. Run database migrations
# ──────────────────────────────────────────────
section "Running database migrations"
if docker info &>/dev/null; then
  pnpm prisma:generate
  pnpm prisma:migrate:dev --name init || warn "Migration failed — check DATABASE_URL in .env"
  info "Database migrated"
else
  warn "Skipping migrations — Docker not running"
fi

# ──────────────────────────────────────────────
# 7. Seed database
# ──────────────────────────────────────────────
section "Seeding database"
if docker info &>/dev/null; then
  pnpm db:seed || warn "Seeding failed — run manually: pnpm db:seed"
  info "Database seeded"
fi

# ──────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────
section "Setup complete"
echo ""
echo -e "  ${GREEN}Start the API:${NC}        pnpm start:dev"
echo -e "  ${GREEN}Swagger UI:${NC}           http://localhost:3000/api"
echo -e "  ${GREEN}Health check:${NC}         http://localhost:3000/api/v1/health"
echo -e "  ${GREEN}Run tests:${NC}            pnpm test:cov"
echo -e "  ${GREEN}Prisma Studio:${NC}        pnpm prisma:studio"
echo ""
echo -e "  ${YELLOW}Remember:${NC} set JWT_SECRET in .env before starting the app!"
echo ""
