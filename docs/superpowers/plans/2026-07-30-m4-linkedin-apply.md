# M4 LinkedIn Easy Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Queue LinkedIn Easy Apply for an existing Job URL with encrypted cookies and dashboard tracking.

**Architecture:** Worker HTTP → browser Playwright runtime; domains own Prisma; plugin gets injected `BrowserPage`.

**Tech Stack:** NestJS, BullMQ, Playwright, Prisma, AES-256-GCM, Next.js

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-m4-linkedin-apply-design.md`
- Apps must not import `@autoapply/database` directly
- Plugins depend on `contracts` only
- Coverage gate: 80% lines/statements via `pnpm test:coverage`
- BullMQ `application.execute`: `attempts: 1`

## Phases

1. Schema, config, contracts
2. `@autoapply/browser-session` domain
3. `@autoapply/applications` domain
4. Browser runtime + LinkedIn plugin + POST /execute
5. API + worker
6. Web UI
7. Docs + SDK + coverage

See cursor plan `milestone_4_linkedin_apply` for file map and interfaces.
