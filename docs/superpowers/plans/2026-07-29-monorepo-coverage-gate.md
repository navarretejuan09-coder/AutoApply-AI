# Monorepo Coverage Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add root `c8` with an 80% lines/statements gate in CI, and write unit tests until `pnpm test:coverage` passes.

**Architecture:** Wrap `turbo run test` with root `c8` and `.c8rc.json` (`all: true` so unloaded source counts as uncovered). Keep Node/`tsx` test runners. Add package tests in ROI order until the gate is green.

**Tech Stack:** c8, pnpm, Turbo, Node 20 test runner, `tsx --test`, GitHub Actions

## Global Constraints

- Threshold: lines 80, statements 80 (monorepo aggregate)
- Exclude: `node_modules`, `dist`, `.next`, `packages/database/src/generated/**`, `**/*.test.ts`
- Do not migrate to Vitest/Jest
- Do not add Codecov or E2E
- Spec: `docs/superpowers/specs/2026-07-29-monorepo-coverage-gate-design.md`

---

## File map

| File                                         | Responsibility                                          |
| -------------------------------------------- | ------------------------------------------------------- |
| `package.json`                               | Add `c8` + `test:coverage` script                       |
| `.c8rc.json`                                 | Include/exclude, `all: true`, reporters, thresholds     |
| `.github/workflows/ci.yml`                   | Run `pnpm test:coverage`                                |
| `docs/architecture.md` (optional light note) | Mention coverage gate if CI docs already describe tests |
| `packages/*/test/*.test.ts` (many)           | New unit tests to raise coverage                        |
| `apps/*/…/*.test.ts` (as needed)             | API/worker/web/browser coverage                         |

---

### Task 1: Wire c8 and CI gate

**Files:**

- Create: `.c8rc.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Produces: root script `pnpm test:coverage` that fails below 80% lines/statements

- [ ] **Step 1: Add `.c8rc.json`**

```json
{
  "all": true,
  "include": ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "packages/database/src/generated/**",
    "**/*.test.ts",
    "**/eslint.config.*",
    "**/next.config.*",
    "**/tailwind.config.*",
    "**/postcss.config.*"
  ],
  "reporter": ["text", "text-summary"],
  "check-coverage": true,
  "lines": 80,
  "statements": 80,
  "branches": 0,
  "functions": 0
}
```

- [ ] **Step 2: Install c8 and add script**

Run: `pnpm add -Dw c8`

Add to root `package.json` scripts:

```json
"test:coverage": "c8 turbo run test"
```

- [ ] **Step 3: Point CI at coverage**

In `.github/workflows/ci.yml`, change the Test step to:

```yaml
- name: Test with coverage
  run: pnpm test:coverage
```

- [ ] **Step 4: Baseline**

Run: `pnpm test:coverage` (expect fail under 80%; capture summary %)

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .c8rc.json .github/workflows/ci.yml
git commit -m "ci: gate PRs on unit tests with 80% c8 coverage"
```

---

### Task 2: Raise coverage with package unit tests

**Files:**

- Create/modify tests under `packages/**/test/` and `apps/**` following existing `node:test` / `tsx --test` patterns (see `packages/embeddings/test/embeddings.test.ts`)
- Update package `test` scripts from empty `node --test` to `tsx --test test/**/*.test.ts` (or explicit file list) when adding TypeScript tests

**Interfaces:**

- Consumes: Task 1 `pnpm test:coverage`
- Produces: ≥80% lines and statements

Priority order:

1. Pure libs: shared, types, config, contracts, logger, commands, events, prompts, embeddings, agents, llm, auth, domains/_, plugins/_, automation, ai, sdk, database (non-generated)
2. apps/api services + apps/worker helpers (mock deps)
3. apps/browser runtime helpers
4. apps/web non-UI modules first (`lib/`), then only as much UI as needed

- [ ] **Step 1:** Add tests for highest-ROI pure packages; run `pnpm test:coverage` and note %
- [ ] **Step 2:** Continue through domains, API, worker, plugins until ≥80%
- [ ] **Step 3:** For Next/React files that cannot run under plain Node, either extract/test pure helpers or add minimal `tsx` tests that exercise importable logic without a browser when possible
- [ ] **Step 4:** Confirm `pnpm test:coverage` exits 0 with ≥80% lines and statements
- [ ] **Step 5:** Commit in logical chunks (e.g. libs, then apps)

---

### Task 3: Document branch protection

**Files:**

- Modify: `docs/superpowers/specs/2026-07-29-monorepo-coverage-gate-design.md` only if checklist needs a pointer from README/architecture — prefer a short note in `docs/architecture.md` under CI if that doc already mentions CI

- [ ] **Step 1:** Ensure architecture/CI docs mention `pnpm test:coverage` and required status check on `main`
- [ ] **Step 2:** Commit doc touch if any

---

## Spec coverage checklist

| Spec requirement                    | Task                               |
| ----------------------------------- | ---------------------------------- |
| Root c8 + 80% lines/statements      | Task 1                             |
| CI uses test:coverage               | Task 1                             |
| Excludes generated/dist/.next/tests | Task 1 `.c8rc.json`                |
| Write tests to green the gate       | Task 2                             |
| Branch protection documented        | Task 3 + existing design checklist |
| No Vitest/Codecov/E2E               | Honored                            |

## Execution

User requested immediate implementation: execute Tasks 1–3 inline in this session.
