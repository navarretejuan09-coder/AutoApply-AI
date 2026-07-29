# GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `.github/workflows/ci.yml` so PRs and pushes to `main` run Prettier format check, lint, typecheck, unit tests, and build.

**Architecture:** Keep the existing single-job workflow. After install, seed a local `.env` via `pnpm setup:env` (required for Next/Prisma build scripts), then run root Turbo/Prettier scripts in fail-fast order. First make `pnpm format:check` green by applying Prettier across the repo, because CI would otherwise fail immediately on ~59 unformatted files.

**Tech Stack:** GitHub Actions (`ubuntu-latest`), pnpm 9, Node 20, Turbo, Prettier, ESLint, `tsc`, Node test runner / `tsx --test`

## Global Constraints

- Triggers: `push` and `pull_request` to `main` only
- Single job; no matrix, no Docker CI services, no secrets
- Do not change application feature behavior beyond formatting and CI YAML
- Match root `packageManager: pnpm@9.15.0` and `engines.node: ">=20"`
- Spec: `docs/superpowers/specs/2026-07-29-github-actions-ci-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `.github/workflows/ci.yml` | CI entrypoint: install, env seed, format/lint/typecheck/test/build |
| Many source/docs/json files (Prettier touch) | Satisfy `pnpm format:check` only — no logic changes |

---

### Task 1: Make Prettier format check pass

**Files:**
- Modify: any files reported by `pnpm format:check` (Prettier rewrite only)

**Interfaces:**
- Consumes: root script `format` / `format:check` in `package.json`
- Produces: clean `pnpm format:check` exit code 0 so Task 2 can enable it in CI

- [ ] **Step 1: Confirm format check currently fails**

Run: `pnpm format:check`

Expected: non-zero exit; message like `Code style issues found in N files`

- [ ] **Step 2: Apply Prettier**

Run: `pnpm format`

Expected: Prettier writes files; command exits 0

- [ ] **Step 3: Re-check format**

Run: `pnpm format:check`

Expected: exit 0; all matched files checked, no “Code style issues” failure

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "$(cat <<'EOF'
style: apply Prettier so format:check can gate CI

EOF
)"
```

Do not stage secrets (`.env`, credentials). Do not stage unrelated untracked noise (e.g. a stray `0` file) unless it is intentional project content.

---

### Task 2: Extend CI workflow with env seed, format check, and tests

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root scripts `setup:env`, `format:check`, `lint`, `typecheck`, `test`, `build`
- Produces: GitHub Actions job that fails if any of those scripts fail

- [ ] **Step 1: Replace `.github/workflows/ci.yml` with the full workflow**

Exact file contents:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup env
        run: pnpm setup:env

      - name: Format check
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 2: Sanity-check YAML structure**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`

If PyYAML is missing, run instead:

```bash
node -e "const fs=require('fs'); const t=fs.readFileSync('.github/workflows/ci.yml','utf8'); if(!t.includes('pnpm test')||!t.includes('format:check')||!t.includes('setup:env')) process.exit(1); console.log('ok')"
```

Expected: prints `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: run format check and unit tests in GitHub Actions

EOF
)"
```

---

### Task 3: Verify CI steps locally (same order as the workflow)

**Files:**
- None (verification only). Fix only if a command fails for a CI-blocking reason related to this work.

**Interfaces:**
- Consumes: same commands as `.github/workflows/ci.yml` after install
- Produces: evidence that format → lint → typecheck → test → build succeed locally

- [ ] **Step 1: Ensure env exists**

Run: `pnpm setup:env`

Expected: exits 0; creates/updates `.env` and `apps/web/.env.local` if needed (do not commit these)

- [ ] **Step 2: Run the gate sequence**

Run:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: each command exits 0. Turbo test summary should show tasks successful (e.g. resume domain tests pass). Build completes including `@autoapply/web` / Prisma packages.

- [ ] **Step 3: If build fails only because `.env` is missing in a clean tree**

Re-run `pnpm setup:env`, then `pnpm build` again. Do not commit `.env`. If a package script hard-requires live Postgres/Redis for `build` (not just `prisma generate`), stop and report — out of scope to add Docker services to CI; propose a follow-up instead of expanding this plan.

- [ ] **Step 4: Commit any necessary CI-safety script fixes** (only if Step 2 required code changes)

```bash
git status
# stage only the fix files, then:
git commit -m "$(cat <<'EOF'
fix: make CI gate scripts runnable without local secrets

EOF
)"
```

If no fixes were needed, skip this commit.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Triggers push/PR to main | Task 2 |
| Single ubuntu job, pnpm 9, Node 20 | Task 2 |
| `setup:env` after install | Task 2 |
| `format:check` | Task 1 (green) + Task 2 (wire) |
| `lint` / `typecheck` / `test` / `build` | Task 2 + Task 3 |
| No e2e/Docker/coverage/matrix | Honored (no tasks) |

## Self-review notes

- No TBD/placeholder steps
- Prettier Task 1 is required because format check already fails on ~59 files
- Commit steps may be skipped if the human executor asks not to commit; still leave the working tree ready
