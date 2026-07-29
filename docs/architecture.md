# AutoApply AI — Architecture (M1.5)

## Overview

AutoApply AI is an event-driven, modular monorepo for AI-assisted job discovery and applications. **M1.5** adds platform boundaries: domain packages, contracts, events, correlation IDs, plugin runtime, and an internal SDK — while keeping product features as stubs until M2+.

## Layers

| Layer        | Location                                          | Responsibility                                       |
| ------------ | ------------------------------------------------- | ---------------------------------------------------- |
| Presentation | `apps/web`                                        | Next.js dashboard, Auth.js login/register            |
| API          | `apps/api`                                        | NestJS REST gateway, JWT auth, queue producer        |
| Worker       | `apps/worker`                                     | BullMQ consumer                                      |
| Browser      | `apps/browser`                                    | Plugin runtime skeleton, stateless session lifecycle |
| SDK          | `packages/sdk`                                    | Internal facade for apps (`sdk.user`, `sdk.jobs`, …) |
| Domains      | `packages/domains/*`                              | Business logic + repositories (Prisma only here)     |
| Contracts    | `packages/contracts`                              | DTOs, API shapes, plugin interfaces, queue payloads  |
| Events       | `packages/events`                                 | Immutable `DomainEvent<T>` envelope                  |
| Commands     | `packages/commands`                               | Command bus + handler interfaces                     |
| Plugins      | `packages/plugins/*`                              | Job board providers (LinkedIn, Greenhouse, …)        |
| AI           | `packages/llm`, `embeddings`, `agents`, `prompts` | Split AI concerns (stubs)                            |
| Platform     | `config`, `logger`, `auth`, `database`, `ui`      | Cross-cutting infrastructure                         |

## Dependency rules

1. **Apps** → prefer `@autoapply/sdk`; never import `@autoapply/database` directly.
2. **Domains** → `contracts`, `events`, `logger`, `config`; Prisma only inside repository implementations.
3. **Plugins** → `contracts` only; no database access.
4. **Env** → only `@autoapply/config` reads `process.env` (plus dotenv bootstrap in app entrypoints).

## Auth flow

1. User registers via `apps/web` → `@autoapply/user.createUser`.
2. User logs in via Auth.js → `@autoapply/user.verifyUserCredentials`.
3. Auth.js issues JWT session; API token signed via `@autoapply/auth`.
4. Web calls API with `Authorization: Bearer` + `X-Correlation-ID`.
5. API verifies JWT via `config.auth.secret`.

## Queue flow (with correlation)

1. Dashboard → `POST /api/users/queue/ping`.
2. API generates/propagates `X-Correlation-ID`, enqueues `health.ping` with `correlationId` + `causationId`.
3. Worker logs structured JSON including correlation fields.

## Browser plugin runtime

```
apps/browser
  └── runtime/
        ├── PluginManager      load("linkedin" | "greenhouse" | …)
        ├── BrowserRuntime     launch → load cookies → execute → save → close
        └── BrowserSessionStore  in-memory stub; Postgres encrypted store in M4
```

Job-board logic lives in `packages/plugins/*`, not in `automation` or the browser service core.

## Package map (M1.5)

```
packages/
  config/          ConfigService (config.database.url, …)
  logger/          Structured JSON logging + correlation context
  contracts/       DTOs, events payloads, JobBoardPlugin interface
  events/          DomainEvent envelope + EventTypes
  commands/        CommandBus + stub commands
  sdk/             Internal API facade
  domains/
    user/            UserRepository + createUser, verifyUserCredentials
    resume/          ResumeRepository + uploadResume, parseResume, list/get
    jobs/          stub
    applications/  stub
    analytics/     stub
    notifications/ stub
  plugins/
    linkedin/      stub JobBoardPlugin
    greenhouse/    stub
    lever/         stub
    workday/       stub
  llm/             stub
  embeddings/      stub
  agents/          stub
  prompts/         stub
  ai/              facade re-exporting AI packages
  automation/      orchestration interfaces (no provider logic)
  database/        Prisma client (internal to domains)
  auth/            Password + JWT
  types/           deprecated shim → contracts
```

## Milestone mapping

| Milestone | Fills in                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| M2        | `@autoapply/resume` — upload (Postgres bytes), async BullMQ parse, deterministic PDF/DOCX skills extraction, dashboard UI |
| M3        | `@autoapply/llm`, `embeddings`, `agents`, `prompts` — Ollama integration                                                  |
| M4        | `@autoapply/plugin-linkedin`, browser cookie persistence, Playwright execution                                            |
| M5        | `@autoapply/analytics`, `@autoapply/notifications`                                                                        |
| M6        | Additional job board plugins                                                                                              |

## Explicit non-goals (M1.5)

- Real resume/jobs/application workflows
- Encrypted cookie storage (interface only)
- Distributed tracing, metrics, secrets manager
- Event sourcing / outbox (envelope only; BullMQ remains transport)
