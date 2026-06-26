# Day 9 - Testing Strategy and Quality Engineering

## What I learned
- Test pyramid: many unit, fewer integration, minimal e2e
- Unit tests: mock everything external
- Integration tests: real DB, no mocks
- E2E tests: full stack, critical paths only
- Coverage thresholds: branches 75, functions 80, lines 80

## Completed
- [x] Unit tests with mocked repositories
- [x] Integration tests verifying companyId scoping
- [x] E2E tests: register, login, create, adjust, delete
- [x] ItemFactory with overridable defaults
- [x] Jest coverage thresholds configured
