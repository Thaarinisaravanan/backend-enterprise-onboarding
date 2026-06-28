# Day 5 — PostgreSQL, Prisma & Multi-Tenancy

## What I learned
- companyId is a security boundary, not just a filter
- @@index([companyId]) required on every multi-tenant model
- Soft delete: deletedAt null = active, set = deleted
- AuditLog must be written in the same transaction as the change
- N+1 problem: use include/select instead of loops

## Schema models
- Company — root tenant entity
- User — belongs to company, has role
- Item — inventory item, tenant-scoped, soft delete
- AuditLog — immutable audit trail

## Completed
- [x] Prisma schema with all models and indexes
- [x] Soft delete filter via 
- [x] CompanyContext service holding companyId from JWT
- [x] Repository always scopes queries with companyId
- [x] Migration applied and indexes verified
- [x] Cross-tenant isolation tested
