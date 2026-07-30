# AutoApply AI

Monorepo for AutoApply AI — AI-powered career platform (M1.5 platform scaffold).

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

| Service  | URL                          | Description                                             |
| -------- | ---------------------------- | ------------------------------------------------------- |
| Web      | http://localhost:3000        | Next.js dashboard + Auth.js                             |
| API      | http://localhost:3001/api    | NestJS REST gateway                                     |
| Browser  | http://localhost:3002/health | Plugin runtime stub (`/plugins` lists loaded providers) |
| Postgres | localhost:5432               | Database                                                |
| Redis    | localhost:6379               | BullMQ                                                  |
| Ollama   | http://localhost:11434       | Local LLM + embeddings (M3)                             |

## Demo user (after seed)

| Field    | Value               |
| -------- | ------------------- |
| Email    | `demo@autoapply.ai` |
| Password | `demo123456`        |

## Workspace layout

```
apps/
  web/       Next.js + Auth.js frontend
  api/       NestJS REST API
  worker/    BullMQ job consumer
  browser/   Plugin runtime skeleton
packages/
  sdk/       Internal API facade
  contracts/ DTOs, plugin interfaces, queue payloads
  events/    DomainEvent envelope
  commands/  Command bus
  logger/    Structured JSON logging
  config/    ConfigService + shared tooling
  domains/
    user/    User domain + repository
    resume/  Resume upload, parse, skills (M2)
    jobs/    Manual job paste + AI match (M3)
    applications/ stub
    analytics/ stub
    notifications/ stub
  plugins/
    linkedin/ greenhouse/ lever/ workday/  (stubs)
  llm/ embeddings/ agents/ prompts/ ai/  (Ollama-backed AI, M3)
  automation/  orchestration interfaces
  database/  Prisma schema and client
  auth/      Password hashing and JWT helpers
  types/     Deprecated shim → contracts
  shared/    Errors, Zod helpers
  ui/        shadcn/ui components
```

## Scripts

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `pnpm install`   | Install all workspace dependencies |
| `pnpm dev`       | Start all apps in development mode |
| `pnpm build`     | Build all packages and apps        |
| `pnpm lint`      | Lint the workspace                 |
| `pnpm typecheck` | Type-check the workspace           |
| `pnpm test`      | Run tests                          |
| `pnpm format`    | Format with Prettier               |

## Environment

See [`.env.example`](.env.example). Required:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `AUTH_SECRET` — Shared secret for Auth.js and API JWT (min 32 chars)
- `NEXT_PUBLIC_API_URL` — API base URL for the web app
- `NEXTAUTH_URL` — Web app URL for Auth.js

## Milestone 1.5

Platform scaffold: domain packages, contracts, events, correlation IDs, ConfigService, structured logger, command bus, internal SDK, plugin runtime skeleton. Auth + health ping remain the live vertical slice.

## Milestone 2

Resume upload (PDF/DOCX stored in Postgres), async parsing via BullMQ worker, deterministic skill extraction, and dashboard UI at `/dashboard/resumes`.

## Milestone 3

Ollama-backed AI packages (`llm`, `embeddings`, `agents`, `prompts`) plus manual job paste matching at `/dashboard/jobs`. Matching embeds the latest parsed resume against the pasted posting (cosine score) and asks the chat model for a short rationale.

After `docker compose up -d`, pull models once:

```bash
docker exec -it autoapply-ollama ollama pull llama3.2
docker exec -it autoapply-ollama ollama pull nomic-embed-text
```

See [docs/architecture.md](docs/architecture.md) for system design, dependency rules, and milestone mapping.
