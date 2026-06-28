# Day 8 - Advanced Queries, Pagination, Redis and Background Jobs

## What I learned
- Cursor pagination: stable under concurrent writes
- Cache-aside: check cache, miss, fetch DB, write cache, return
- Cache keys must include companyId to prevent cross-tenant poisoning
- Atomic transactions: quantity update and AuditLog succeed or both fail
- Never do expensive work synchronously

## Completed
- [x] Cursor pagination returning data, nextCursor, hasMore
- [x] Composable filters: status, category, quantity range, search
- [x] Inventory adjustment in atomic transaction with AuditLog
- [x] Redis caching with companyId-scoped cache key
- [x] Cache invalidation on item writes
- [x] BullMQ low-stock job with retry logic
