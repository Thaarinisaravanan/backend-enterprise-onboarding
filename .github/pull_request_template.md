## What does this PR do?

<!-- A clear, one-paragraph description of what this change does and why. -->

## Type of change

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `refactor` — Code refactor (no feature/fix)
- [ ] `test` — Tests only
- [ ] `chore` — Tooling, CI, dependencies
- [ ] `docs` — Documentation only

## How to test locally

```bash
# Step-by-step commands a reviewer can run to verify this change
pnpm install
pnpm prisma:migrate:dev
pnpm start:dev
# Then: curl http://localhost:3000/api/v1/health
```

## Checklist

- [ ] I have read the Team Engineering Standards
- [ ] My commits follow Conventional Commits format
- [ ] I have added/updated tests for the changes
- [ ] All tests pass locally (`pnpm test:cov`)
- [ ] Coverage thresholds are met (branches 75%, functions/lines/statements 80%)
- [ ] No raw Prisma objects returned from controllers — response DTOs used
- [ ] All new endpoints are documented in Swagger (`@ApiProperty`, `@ApiOperation`)
- [ ] No hardcoded secrets, URLs, or environment-specific values
- [ ] All queries in multi-tenant models include `companyId` scoping
- [ ] Sensitive data is not logged (passwords, tokens, PII)
- [ ] I have performed a self-review of my own diff

## Known limitations / follow-ups

<!-- List anything intentionally left out or deferred. -->
