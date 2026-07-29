# M1 Foundation Design

**Date:** 2026-07-29  
**Status:** Approved

## Goal

Runnable local stack: Docker Compose + `pnpm dev` brings up Postgres, Redis, Ollama, Next.js (Auth.js), NestJS API, worker, and browser health stub.

## Decisions

- **Scope:** Milestone 1 only
- **Auth:** Auth.js v5 credentials provider with JWT session; shared `AUTH_SECRET` with NestJS
- **API:** REST only; GraphQL deferred
- **Scaffold:** Hybrid — hand-rolled monorepo + generated Next/Nest patterns

## Auth

- Registration via `POST /api/register` (Next.js route)
- Login via Auth.js credentials provider
- `accessToken` in session for API Bearer auth
- NestJS `JwtAuthGuard` verifies token via `packages/auth`

## Apps

| App     | M1 deliverable                               |
| ------- | -------------------------------------------- |
| web     | Login, register, dashboard shell, API client |
| api     | Health, `GET /users/me`, queue ping producer |
| worker  | BullMQ `health.ping` consumer                |
| browser | HTTP `/health` stub                          |

## Packages

- `database`: User model only
- `auth`: bcrypt + jose JWT
- `types`, `shared`, `config`, `ui`: shared utilities
- `ai`, `automation`, `prompts`: placeholder stubs

## Out of scope

Resume workflows, AI agents, Playwright applications, analytics, GraphQL.
