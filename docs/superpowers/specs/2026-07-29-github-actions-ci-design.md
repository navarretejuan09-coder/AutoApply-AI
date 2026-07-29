# GitHub Actions CI Design

**Date:** 2026-07-29  
**Status:** Approved

## Goal

Extend the existing CI workflow so every PR and push to `main` runs formatting, lint, typecheck, unit tests, and build — failing the check on any step failure.

## Decisions

- **Scope:** Lint + unit tests + typecheck + build + Prettier format check
- **Triggers:** `push` and `pull_request` targeting `main`
- **Layout:** Single job on `ubuntu-latest` (extend `.github/workflows/ci.yml`)
- **Tooling:** pnpm 9, Node 20, Turbo via root scripts
- **Env:** Run `pnpm setup:env` after install so `.env` exists for Next build / Prisma generate (placeholder values from `.env.example`; no GitHub secrets)

## Workflow steps (order)

1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` (version 9)
3. `actions/setup-node@v4` (Node 20, `cache: pnpm`)
4. `pnpm install --frozen-lockfile`
5. `pnpm setup:env`
6. `pnpm format:check`
7. `pnpm lint`
8. `pnpm typecheck`
9. `pnpm test`
10. `pnpm build`

## Success criteria

- CI fails when format, lint, typecheck, unit tests, or build fails
- Unit tests run through Turbo (`turbo run test`); packages without real test files still report success via existing `node --test` scripts
- No new app/package feature code required unless a script is not CI-safe

## Out of scope

- E2E / Playwright
- Docker Compose / Postgres / Redis as CI services
- Coverage upload / badges
- Turborepo remote cache
- Branch protection rules (manual GitHub setting)
- Node version matrix
- Parallel jobs or composite setup actions
