# Day 11 — CI/CD & Automated Delivery

## What I learned
- CI pipeline is the team quality gate — enforces what humans miss
- Service containers in GitHub Actions provide real DB and Redis
- Branch protection makes quality gates enforceable
- Never print secrets in CI logs
- CODEOWNERS ensures right team reviews right code

## Pipeline jobs
1. lint — ESLint + Prettier check
2. typecheck — tsc --noEmit
3. unit-test — Jest with coverage gate (80%)
4. integration-test — real PostgreSQL + Redis service containers
5. docker-build — production image must build successfully

## Completed
- [x] GitHub Actions CI workflow with all 5 jobs
- [x] Test job uses PostgreSQL and Redis service containers
- [x] Coverage threshold enforced — fails if below 80%
- [x] Docker build job confirms production image builds
- [x] Branch protection rules on main
- [x] CODEOWNERS file assigning ownership of critical paths
