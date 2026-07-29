# AutoApply AI — Architecture (Milestone 1)

## Overview

AutoApply AI is an event-driven, modular monorepo for AI-assisted job discovery and applications. Milestone 1 establishes the foundation: infrastructure, auth, API gateway, and service stubs.

## Layers

| Layer | App/Package | Responsibility |
|-------|-------------|----------------|
| Presentation | `apps/web` | Next.js dashboard, Auth.js login/register |
| API | `apps/api` | NestJS REST gateway, JWT auth, queue producer |
| Worker | `apps/worker` | BullMQ consumer (health ping stub) |
| Browser | `apps/browser` | Playwright health stub |
| Database | `packages/database` | Prisma schema and client |
| Auth | `packages/auth` | Password hashing, JWT sign/verify |
| Shared | `packages/types`, `shared`, `config`, `ui` | DTOs, logging, env, UI |

## Auth flow

1. User registers or logs in via Auth.js (credentials) in `apps/web`.
2. Web creates/verifies users in Postgres via Prisma.
3. Auth.js issues a JWT session; `accessToken` is signed with `@autoapply/auth` using `AUTH_SECRET`.
4. Web calls NestJS with `Authorization: Bearer <accessToken>`.
5. API verifies JWT and serves protected routes (e.g. `GET /api/users/me`).

## Queue flow (M1 stub)

1. Authenticated user triggers `POST /api/users/queue/ping` from dashboard.
2. API enqueues `health.ping` on BullMQ `health` queue.
3. Worker consumes job and logs payload.

## M1 boundaries

**In scope:** Monorepo, Docker Compose, User model, auth, health endpoints, queue wiring.

**Out of scope:** Resume parsing, LangGraph agents, Playwright job applications, multi-provider job boards, GraphQL, analytics.

## Future milestones

- **M2:** Career profile — resume upload, parsing, skills
- **M3:** Ollama integration — matching, cover letters
- **M4:** Playwright automation — LinkedIn provider, approval workflow
- **M5:** Analytics and notifications
- **M6:** Multi-provider job boards
