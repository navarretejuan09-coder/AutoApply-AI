# M4 LinkedIn Easy Apply Design

**Date:** 2026-07-30  
**Status:** Approved

## Goal

End-to-end LinkedIn Easy Apply: import encrypted cookies, queue an application for an existing Job URL, execute via Playwright in the browser service, and track status in the dashboard.

## Decisions

- **Scope:** Full apply slice (domain + queue + API + worker + web UI)
- **Auth:** Cookie import only (Playwright `storageState` JSON); no interactive LinkedIn login
- **Automation:** Easy Apply against existing Job URL; no LinkedIn search crawl
- **Orchestration:** Worker → HTTP → `apps/browser`
- **Playwright:** Runtime-owned lifecycle; LinkedIn plugin receives injected `BrowserPage`
- **Sessions:** AES-256-GCM encrypted `BrowserSession` in Postgres via `@autoapply/browser-session` domain
- **Service auth:** `BROWSER_INTERNAL_TOKEN` header on browser `POST /execute`

## Architecture

See milestone plan data-flow diagram. Applications domain tracks status; browser-session domain encrypts cookies; browser app owns Playwright.

## Prisma

- `ApplicationStatus`: `queued | submitting | submitted | failed`
- `Application`: userId, jobId, provider (default `linkedin`), status, externalApplicationId?, errorMessage?; unique `(userId, jobId, provider)`
- `BrowserSession`: userId, provider, encryptedCookies, iv, authTag; unique `(userId, provider)`

## Config

- `COOKIE_ENCRYPTION_KEY` — 32-byte key (base64)
- `BROWSER_URL` — worker → browser base URL
- `BROWSER_HEADLESS` — default true
- `BROWSER_INTERNAL_TOKEN` — shared secret for execute endpoint

## Out of scope

Interactive login/MFA/CAPTCHA; LinkedIn search; other board plugins; complex Easy Apply Q&A; resume upload from DB; analytics/notifications (M5).

## Verification

Unit tests (crypto, domains, plugin fixtures, runtime mocks); manual smoke with real cookies; `pnpm test:coverage` ≥80%.
