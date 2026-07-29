# AutoApply AI

Monorepo for AutoApply AI — AI-powered career platform (Milestone 1 foundation).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9
- [Docker](https://www.docker.com/) (Postgres, Redis, Ollama)

## Quick start

```bash
# Install dependencies
pnpm install

# Copy environment template and generate AUTH_SECRET
cp .env.example .env
pnpm setup:env

# Start infrastructure
docker compose up -d

# Run database migrations and seed
pnpm --filter @autoapply/database db:migrate
pnpm --filter @autoapply/database db:seed

# Start all apps (web, api, worker, browser)
pnpm dev
# Or: ./scripts/dev.sh
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Web | http://localhost:3000 | Next.js dashboard + Auth.js |
| API | http://localhost:3001/api | NestJS REST gateway |
| Browser | http://localhost:3002/health | Playwright service stub |
| Postgres | localhost:5432 | Database |
| Redis | localhost:6379 | BullMQ |
| Ollama | http://localhost:11434 | Local LLM (unused in M1) |

## Demo user (after seed)

| Field | Value |
|-------|-------|
| Email | `demo@autoapply.ai` |
| Password | `demo123456` |

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

See [`.env.example`](.env.example). Required:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `AUTH_SECRET` — Shared secret for Auth.js and API JWT (min 32 chars)
- `NEXT_PUBLIC_API_URL` — API base URL for the web app
- `NEXTAUTH_URL` — Web app URL for Auth.js

## Milestone 1

Foundation complete: monorepo, Docker Compose, Prisma User model, Auth.js login/register, NestJS JWT-protected API, BullMQ health ping stub, browser health endpoint, CI.

See [docs/architecture.md](docs/architecture.md) for system design and M1 boundaries.
