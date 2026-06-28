# Days 12-14 — Enterprise Capstone Project

## Project: Multi-Tenant Inventory & Workflow Management API

## All standards from Days 0-11 applied from a blank repository

## Functional requirements delivered
- [x] Multi-tenancy — all data company-scoped, cross-tenant access impossible
- [x] User management — ADMIN, MANAGER, VIEWER roles with RBAC
- [x] Inventory CRUD — title, description, SKU, quantity, status, category
- [x] Soft delete — deletedAt excludes from all queries automatically
- [x] Inventory adjustments — atomic transaction with AuditLog
- [x] Advanced queries — cursor pagination, filters, full-text search
- [x] Low-stock alerts — BullMQ job enqueued in same transaction
- [x] Redis caching — summary endpoint cached 60s per company

## Technical requirements delivered
- [x] JWT authentication with bcrypt password hashing
- [x] RBAC — RolesGuard + @Roles() decorator
- [x] API versioning under /v1/
- [x] Response envelope { data, meta?, errors? }
- [x] AppException hierarchy with errorCodes
- [x] Pino structured logging with AsyncLocalStorage
- [x] Health checks — /health and /health/ready
- [x] Swagger documentation at /api
- [x] Multi-stage Dockerfile with non-root user
- [x] GitHub Actions CI pipeline — all jobs green
- [x] Unit + integration + e2e tests, 80% coverage
- [x] README with full setup instructions

## Architecture decisions
- Fastify over Express: 2x faster, better plugin model
- Repository pattern: services never import PrismaClient directly
- AsyncLocalStorage: requestId/userId/companyId in every log line
- Cursor pagination: stable under concurrent writes
- Atomic transactions: AuditLog always written with the change
