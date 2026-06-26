# Day 6 — Authentication, Authorization & RBAC

## What I learned
- JWT: signed on login, verified on every request
- Bcrypt: one-way hash, salt, cost factor ~100ms
- Never put sensitive data in JWT payload — it is base64 not encrypted
- IDOR prevention: always scope by companyId from JWT, never from request body
- Return 404 not 403 for IDOR attempts — reveals less about data model

## Roles
- ADMIN — full access
- MANAGER — manage inventory, cannot modify users/roles
- VIEWER — read only

## Key files created
- src/auth/auth.service.ts — register, login, JWT signing
- src/auth/strategies/jwt.strategy.ts — validates token
- src/common/guards/roles.guard.ts — enforces @Roles() decorator
- src/common/decorators/current-user.decorator.ts

## Completed
- [x] Register with bcrypt password hashing
- [x] Login returning JWT with userId + companyId + role
- [x] JwtStrategy validates and attaches user to request
- [x] RolesGuard enforcing RBAC on all write endpoints
- [x] IDOR test: Company B cannot access Company A items
- [x] Security audit log on login success and failure
