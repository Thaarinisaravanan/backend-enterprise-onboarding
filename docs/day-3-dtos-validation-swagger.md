# Day 3 — DTOs, Validation & API Contracts

## What I learned
- DTOs define what is accepted in and guaranteed back
- whitelist:true strips extra fields silently
- forbidNonWhitelisted:true rejects undocumented fields
- Never return raw Prisma objects — always map to response DTOs
- Zod validates env vars at startup — fail fast on bad config

## Key files created
- src/items/dto/items.dto.ts — CreateItemDto, UpdateItemDto, ItemResponseDto
- src/auth/dto/auth.dto.ts — RegisterDto, LoginDto, AuthResponseDto
- src/config/env.validation.ts — Zod env validation

## Completed
- [x] DTOs with full class-validator decorators
- [x] Standard response envelope { data, meta?, errors? }
- [x] ValidationPipe registered globally
- [x] Swagger live at /api
- [x] Zod environment variable validation at startup
