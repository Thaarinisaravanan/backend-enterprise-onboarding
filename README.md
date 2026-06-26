# Backend Enterprise Onboarding

**14-Day Enterprise Engineering Standards & Contribution Track**

A production-grade, multi-tenant inventory and workflow management API built across 14 days of structured learning. Every pattern here mirrors the standards applied to production pull requests.

---

## Stack

| Tool | Purpose |
|------|---------|
| NestJS + Fastify | Backend framework — layered architecture, DI, guards, interceptors |
| TypeScript | Type safety across the full codebase |
| Prisma + PostgreSQL | ORM with versioned migrations, multi-tenant data isolation |
| Redis + BullMQ | Caching, rate limiting, background job queues |
| Docker | Identical environments from local to production |
| GitHub Actions | CI/CD — lint, test, build, coverage gate on every PR |
| Swagger | Auto-generated API contract |
| Pino | Structured JSON logging with correlation IDs |
| Jest | Unit, integration, and e2e tests with coverage thresholds |
| Zod | Environment variable validation at startup |

---

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) + Node.js LTS (v20+)
- [pnpm](https://pnpm.io) — `corepack enable && corepack prepare pnpm@latest --activate`
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/backend-enterprise-onboarding.git
cd backend-enterprise-onboarding

# 2. One-command setup (installs deps, hooks, starts Docker, migrates DB, seeds)
bash setup.sh

# 3. Set your JWT secret in .env
#    Open .env and change JWT_SECRET to a long random string

# 4. Start the API
pnpm start:dev
```

The API is now running at `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. **Never commit `.env`.**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Runtime environment | `development` |
| `PORT` | No | HTTP port | `3000` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/enterprise_onboarding` |
| `DATABASE_TEST_URL` | No | Test database URL | `postgresql://postgres:postgres@localhost:5433/enterprise_onboarding_test` |
| `JWT_SECRET` | **Yes** | JWT signing secret (min 32 chars) | `change-me-use-a-long-random-string` |
| `JWT_EXPIRATION` | No | JWT TTL | `15m` |
| `REDIS_HOST` | No | Redis hostname | `localhost` |
| `REDIS_PORT` | No | Redis port | `6379` |
| `REDIS_PASSWORD` | No | Redis password (if set) | _(empty)_ |
| `BCRYPT_ROUNDS` | No | Bcrypt cost factor (10–14) | `12` |
| `LOW_STOCK_THRESHOLD` | No | Default low-stock threshold | `10` |
| `CACHE_TTL_SECONDS` | No | Redis cache TTL | `60` |

---

## How to Run

```bash
# Development (watch mode)
pnpm start:dev

# Production build
pnpm build
pnpm start:prod

# Docker (full stack)
docker compose up --build

# Docker (infra only — PostgreSQL + Redis)
docker compose up -d postgres redis
```

---

## Database

```bash
# Apply migrations (dev)
pnpm prisma:migrate:dev

# Apply migrations (production)
pnpm prisma:migrate:deploy

# Seed with test data
pnpm db:seed

# Open Prisma Studio (visual DB browser)
pnpm prisma:studio

# Reset and re-seed (dev only)
pnpm prisma:reset && pnpm db:seed
```

---

## How to Run Tests

```bash
# Unit tests (fast, no DB required)
pnpm test

# Unit tests with coverage report
pnpm test:cov

# Watch mode
pnpm test:watch

# E2E tests (requires running DB + Redis)
docker compose -f docker-compose.test.yml up -d
pnpm prisma:migrate:deploy   # apply to test DB
pnpm test:e2e
```

Coverage thresholds (enforced in CI):

| Metric | Threshold |
|--------|-----------|
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |
| Statements | 80% |

---

## API Endpoints

All endpoints are versioned under `/api/v1/`. Interactive docs available at `http://localhost:3000/api`.

### Auth (public — no token required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user in a company |
| `POST` | `/api/v1/auth/login` | Login and receive a JWT |

### Items (JWT required)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/items` | All | List items with cursor pagination + filters |
| `GET` | `/api/v1/items/summary` | All | Inventory summary (cached, 60s TTL) |
| `GET` | `/api/v1/items/:id` | All | Get single item |
| `POST` | `/api/v1/items` | ADMIN, MANAGER | Create item |
| `PATCH` | `/api/v1/items/:id` | ADMIN, MANAGER | Update item |
| `POST` | `/api/v1/items/:id/adjust` | ADMIN, MANAGER | Adjust quantity (atomic + audit log) |
| `DELETE` | `/api/v1/items/:id` | ADMIN | Soft-delete item |

### Health (public)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Liveness — is the process alive? |
| `GET` | `/api/v1/health/ready` | Readiness — DB and Redis connected? |

### Query Parameters for `GET /api/v1/items`

| Param | Type | Description |
|-------|------|-------------|
| `status` | `IN_STOCK \| LOW_STOCK \| OUT_OF_STOCK` | Filter by status |
| `category` | `string` | Filter by category |
| `search` | `string` | Full-text search on title |
| `minQuantity` | `number` | Minimum quantity |
| `maxQuantity` | `number` | Maximum quantity |
| `createdAfter` | `ISO date` | Filter by creation date |
| `createdBefore` | `ISO date` | Filter by creation date |
| `cursor` | `string` | Cursor for next page |
| `limit` | `number` | Page size (default 20) |
| `sort` | `field:asc\|desc` | e.g. `createdAt:desc` |

---

## Architecture

```
src/
├── auth/                    # JWT auth, bcrypt, login/register
│   ├── dto/                 # RegisterDto, LoginDto, AuthResponseDto
│   └── strategies/          # JwtStrategy (passport-jwt)
├── common/
│   ├── decorators/          # @Public(), @Roles(), @CurrentUser()
│   ├── exceptions/          # AppException hierarchy
│   ├── filters/             # GlobalExceptionFilter
│   ├── guards/              # JwtAuthGuard, RolesGuard, CompanyContextService
│   ├── interceptors/        # LoggingInterceptor, TransformInterceptor
│   ├── middleware/          # RequestContextMiddleware (AsyncLocalStorage)
│   └── utils/               # log-sanitizer
├── config/                  # Zod env validation, configuration factory
├── health/                  # /health and /health/ready endpoints
├── items/
│   ├── dto/                 # CreateItemDto, UpdateItemDto, ItemResponseDto, ...
│   ├── repository/          # IItemsRepository interface + PrismaItemsRepository
│   ├── items.service.ts     # Business logic — never imports PrismaClient directly
│   └── items.controller.ts  # HTTP layer only — calls service, returns DTOs
├── jobs/
│   └── processors/          # LowStockProcessor (BullMQ worker)
├── prisma/                  # PrismaService (soft-delete middleware, $connect)
├── redis/                   # RedisService (ioredis wrapper)
└── main.ts                  # Fastify bootstrap, Swagger, global pipes
```

### Key Design Decisions

**Layered architecture**: Controller → Service → Repository. Each layer has one job. The service never imports `@prisma/client` directly — only the repository interface.

**Multi-tenancy**: Every query is scoped by `companyId`. The repository throws if `companyId` is missing. Cross-tenant access is architecturally impossible — there is no `findAll()` without a `companyId`.

**Soft delete**: `deletedAt` is `null` for active records. Prisma middleware automatically injects `deletedAt: null` on all read operations — deleted records are invisible to the rest of the code.

**Request correlation**: `RequestContextMiddleware` generates a UUID `requestId` per request and stores it in `AsyncLocalStorage`. Every log line and every error response includes this `requestId` automatically.

**Audit log**: Every `create`, `update`, `delete`, and inventory adjustment writes an `AuditLog` record in the same Prisma transaction. If the audit write fails, the main operation is rolled back.

---

## Git Workflow

Branches follow the naming convention:

```
feature/day-N-description
fix/short-description
chore/short-description
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat(items): add cursor-based pagination
fix(auth): handle expired jwt gracefully
chore(deps): upgrade prisma to 5.8.0
test(items): add integration tests for soft delete
```

Create all day branches at once:

```bash
bash branch-setup.sh
git push origin --all
```

---

## CI/CD

The GitHub Actions pipeline runs on every push and PR:

1. **Lint** — ESLint + Prettier check
2. **Typecheck** — `tsc --noEmit`
3. **Unit tests + coverage** — must meet thresholds
4. **Integration tests** — real PostgreSQL + Redis via service containers
5. **Docker build** — production image must build successfully

Branch protection on `main` requires all jobs to pass before merge.

---

## Day-by-Day Branch Map

| Branch | Day(s) | Topic |
|--------|--------|-------|
| `feature/day-0-engineering-culture` | 0 | Culture, setup, reading |
| `feature/day-1-git-workflow` | 1 | Git, Conventional Commits, PR standards |
| `feature/day-2-nestjs-architecture` | 2 | NestJS, layered arch, repository pattern |
| `feature/day-3-dtos-validation-swagger` | 3 | DTOs, class-validator, Swagger, Zod |
| `feature/day-4-request-pipeline-guards` | 4 | Middleware, guards, interceptors, Pino |
| `feature/day-5-database-prisma-multitenancy` | 5 | Prisma, migrations, soft delete, multi-tenancy |
| `feature/day-6-auth-rbac` | 6 | JWT, bcrypt, RBAC, IDOR prevention |
| `feature/day-7-observability-logging` | 7 | AsyncLocalStorage, health checks, error hierarchy |
| `feature/day-8-advanced-queries-redis-jobs` | 8 | Cursor pagination, Redis cache, BullMQ |
| `feature/day-9-testing-strategy` | 9 | Unit, integration, e2e tests, coverage gates |
| `feature/day-10-docker-containerisation` | 10 | Multi-stage Dockerfile, docker-compose |
| `feature/day-11-ci-cd` | 11 | GitHub Actions, branch protection, CODEOWNERS |
| `feature/day-12-14-enterprise-capstone` | 12–14 | Full capstone — all standards applied |

---

## Final Assessment (Day 14)

The Day 14 PR is reviewed to the same standard as any production PR. The reviewer will ask:

- Walk me through what happens from the moment `PATCH /api/v1/items/:id` arrives to the response being sent
- How does the system ensure Company A cannot access Company B's items?
- What would break first at 10,000 requests per second?
- If you had another week, what would you change?

The PR description must include: what it does, architecture decisions made, how to test locally, and known limitations.
