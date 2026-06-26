# Day 7 — Structured Logging, Observability & Error Handling

## What I learned
- AsyncLocalStorage propagates requestId through all async code
- Error codes (ITEM_NOT_FOUND) are stable contracts — messages can change
- /health = is process alive, /ready = can it serve traffic
- Never log passwords, tokens, PII — log sanitiser as safety net
- The requestId in every log line is what makes production diagnosis possible

## Exception hierarchy
- AppException (base)
  - NotFoundException
  - ForbiddenException
  - ConflictException
  - ValidationException
  - UnauthorizedException

## Key files created
- src/common/exceptions/app.exception.ts
- src/common/utils/log-sanitizer.ts
- src/health/health.controller.ts

## Completed
- [x] Pino with AsyncLocalStorage context
- [x] AppException hierarchy with errorCodes
- [x] GlobalExceptionFilter returns standard error envelope
- [x] GET /v1/health returns status, version, uptime
- [x] GET /v1/health/ready checks DB and Redis
- [x] Log sanitiser strips sensitive fields
