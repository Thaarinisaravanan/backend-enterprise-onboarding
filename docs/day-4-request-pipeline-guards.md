# Day 4 — Request Pipeline, Guards & Interceptors

## What I learned
- Request lifecycle: Middleware ? Guards ? Interceptors ? Pipes ? Controller ? Interceptors ? Filters
- requestId propagates through AsyncLocalStorage for the entire request lifetime
- Guards are NestJS-aware (ExecutionContext), Middleware is raw Node.js
- Interceptors run TWICE — before and after the handler
- GlobalExceptionFilter is the last line of defence

## Key files created
- src/common/middleware/request-context.middleware.ts
- src/common/interceptors/logging.interceptor.ts
- src/common/filters/global-exception.filter.ts
- src/common/guards/jwt-auth.guard.ts

## Completed
- [x] RequestContextMiddleware generating UUID requestId
- [x] LoggingInterceptor logging all request fields via Pino
- [x] GlobalExceptionFilter returning standard error envelope
- [x] CompanyContextGuard extracting companyId from JWT
- [x] All applied globally in main.ts
