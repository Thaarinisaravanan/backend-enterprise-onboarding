# Day 2 — Architecture Principles & NestJS Structure

## What I learned
- Layered architecture: Controller -> Service -> Repository -> DB
- Dependency Inversion: depend on interfaces not implementations
- Repository pattern makes services unit-testable
- NestJS modules enforce separation of concerns

## Key files created
- src/items/items.controller.ts — HTTP layer only
- src/items/items.service.ts — business logic only
- src/items/repository/items.repository.interface.ts — data contract
- src/items/repository/prisma-items.repository.ts — DB implementation

## Completed
- [x] NestJS project scaffolded with Fastify adapter
- [x] Items module created with correct layered structure
- [x] IItemsRepository interface defined
- [x] PrismaItemsRepository implements IItemsRepository
- [x] All routes versioned under /v1/
