# Monorepo Unit Test Coverage Gate Design

**Date:** 2026-07-29  
**Status:** Approved

## Goal

Every pull request and push to `main` must pass unit tests and fail when overall monorepo line (and statement) coverage is below **80%**. Raise coverage with new unit tests so the gate is green when this work lands.

## Decisions

- **Approach:** Root-level [c8](https://github.com/bcoe/c8) wrapping the existing Turbo test suite (Approach A).
- **Threshold:** `--check-coverage --lines 80 --statements 80` (monorepo-wide aggregate).
- **Test runner:** Keep Node’s test runner / `tsx --test`; do not migrate to Vitest/Jest.
- **Scope of tests:** Write enough unit tests across handwritten source to meet the threshold before merging.
- **CI:** Replace `pnpm test` with `pnpm test:coverage` in `.github/workflows/ci.yml`; leave format, lint, typecheck, and build steps unchanged.
- **Merge blocking:** Document that the CI job must be a required status check on `main` (manual GitHub branch protection). Workflow failure alone does not block merges without that setting.

## Coverage tooling

| Piece | Responsibility |
| --- | --- |
| Root `c8` devDependency | Instrument and report coverage for the monorepo test run |
| Root script `test:coverage` | Run `c8` around `turbo run test` with the 80% check |
| `.c8rc.json` (repo root) | Include/exclude globs and reporter defaults |
| `.github/workflows/ci.yml` | Invoke `pnpm test:coverage` instead of `pnpm test` |

Local developers can still run `pnpm test` without the coverage gate; CI enforces coverage.

## What counts toward coverage

**Include:** Handwritten TypeScript under `apps/**` and `packages/**` (`.ts` only).

**Exclude:**

- `**/node_modules/**`
- `**/dist/**`
- `**/.next/**`
- Prisma generated client: `packages/database/src/generated/**`
- Test files: `**/*.test.ts`
- Declaration files: `**/*.d.ts`
- React/Next UI: `**/*.tsx` (requires a browser/DOM harness; unit gate covers `.ts` modules and web helpers such as `lib/api.ts`)
- Optional bootstrap/config noise only if it skews the denominator without meaningful product logic (e.g. ESLint / Next / Tailwind config). Prefer minimal excludes.

This is a monorepo-wide gate over product TypeScript modules (`all: true` in c8), not a phased soft-exclude of untested packages.

## Test strategy

Priority for new tests (highest ROI first):

1. Pure / domain libraries — config, contracts helpers, shared, embeddings, prompts, agents, domains, auth, llm, and similar
2. API and worker logic — services and helpers with mocked dependencies
3. Remaining packages and plugins (thin modules included)
4. Web — prefer non-UI modules (`lib/api.ts`, etc.); add light component coverage only as needed to clear 80%

Package `test` scripts that today run empty `node --test` should gain real `*.test.ts` files (and `tsx --test` where TypeScript is required) as tests are added.

## Workflow steps (coverage-related)

After existing install / `setup:env` / format / lint / typecheck:

1. `pnpm test:coverage` (replaces `pnpm test`)
2. `pnpm build` (unchanged)

## Success criteria

- `pnpm test:coverage` exits non-zero when line or statement coverage is below 80%
- CI runs `pnpm test:coverage` on `pull_request` and `push` to `main`
- A full local `pnpm test:coverage` run reports ≥80% lines and statements before this work is considered done
- Branch protection checklist is documented for requiring the CI check on `main`

## Out of scope

- E2E / Playwright
- Coverage upload services (Codecov, Coveralls, badges)
- Switching test frameworks
- Docker Compose / Postgres / Redis as CI services for integration tests
- Automating GitHub branch protection via API (document manual steps only)

## Branch protection checklist (manual)

In GitHub → Settings → Branches → Branch protection rule for `main`:

1. Enable **Require status checks to pass before merging**
2. Require the CI job from `.github/workflows/ci.yml` (e.g. `build`)
3. Optionally require branches to be up to date before merging
