# AutoApply AI

Monorepo for AutoApply AI — automated job application platform (Milestone 1 foundation).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9
- [Docker](https://www.docker.com/) (for Postgres, Redis, Ollama)

## Quick start

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start infrastructure (Task 2+)
docker compose up -d

# Run database migrations and seed (Task 3+)
pnpm --filter @autoapply/database prisma migrate dev
pnpm --filter @autoapply/database db:seed

# Start all apps in dev mode (Task 5+)
pnpm dev
```

## Workspace layout

```
apps/
  web/       Next.js + Auth.js frontend
  api/       NestJS REST API
  worker/    BullMQ job consumer
  browser/   Playwright health stub
packages/
  database/  Prisma schema and client
  auth/      Password hashing and JWT helpers
  types/     Shared TypeScript types
  shared/    Logger, errors, Zod helpers
  config/    Shared TS, ESLint, Prettier configs
  ui/        shadcn/ui components
  ai/        AI agents (stub)
  automation/ Job automation (stub)
  prompts/   Prompt templates (stub)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint the workspace |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Run tests |
| `pnpm format` | Format with Prettier |

## Environment

See [`.env.example`](.env.example) for required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `OLLAMA_HOST` — Local Ollama API URL
- `AUTH_SECRET` — Shared secret for Auth.js and API JWT verification

## Milestone 1 status

This scaffold provides the Turborepo/pnpm workspace root. Subsequent tasks add Docker Compose, Prisma, shared packages, NestJS API, Next.js web app, worker/browser stubs, and CI.
