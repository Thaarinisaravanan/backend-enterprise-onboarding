# Day 10 — Docker & Containerisation

## What I learned
- Multi-stage build: build stage compiles, production stage is lean
- Never run Node.js as root in a container
- Never build env vars into a Docker image — inject at runtime
- .env.example committed, .env never committed
- HEALTHCHECK lets Docker know when container is ready

## Docker setup
- Stage 1 (builder): installs all deps, compiles TypeScript
- Stage 2 (production): only dist/ + node_modules + non-root user
- docker-compose.yml: app + postgres + redis in one command
- docker-compose.test.yml: isolated test DB, in-memory (tmpfs)

## Completed
- [x] Multi-stage Dockerfile with non-root user
- [x] docker-compose.yml with PostgreSQL and Redis volumes
- [x] .env.example with all variables documented
- [x] HEALTHCHECK pointing at /v1/health
- [x] docker-compose.test.yml for isolated test environment
- [x] docker compose up --build starts successfully
