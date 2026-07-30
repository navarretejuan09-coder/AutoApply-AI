import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { EventTypes } from "@autoapply/events";

import { sdk } from "../src/index.js";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "x".repeat(32),
  API_URL: "http://localhost:3001",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_URL: "http://localhost:3001",
  NODE_ENV: "test",
};

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function applyValidEnv(): void {
  for (const [key, value] of Object.entries(validEnv)) {
    process.env[key] = value;
  }
}

describe("sdk namespaces", () => {
  it("exposes domain and infrastructure modules", () => {
    assert.equal(typeof sdk.user, "object");
    assert.equal(typeof sdk.resume, "object");
    assert.equal(typeof sdk.jobs, "object");
    assert.equal(typeof sdk.applications, "object");
    assert.equal(typeof sdk.analytics, "object");
    assert.equal(typeof sdk.notifications, "object");
    assert.equal(typeof sdk.automation, "object");
    assert.equal(typeof sdk.ai, "object");
    assert.ok(sdk.commands);
    assert.ok(sdk.events);
    assert.ok(sdk.config);
  });
});

describe("sdk.events", () => {
  it("creates domain events via the events helper", () => {
    const event = sdk.events.create({
      type: EventTypes.HealthPingRequested,
      payload: { source: "sdk-test", timestamp: "2026-01-01T00:00:00.000Z" },
      metadata: { correlationId: "c1", causationId: "ca1" },
    });

    assert.equal(event.type, EventTypes.HealthPingRequested);
    assert.equal(event.payload.source, "sdk-test");
  });

  it("exposes EventTypes", () => {
    assert.equal(sdk.events.types.JobFound, "job.found");
  });
});

describe("sdk.config", () => {
  it("reads config through getters", () => {
    applyValidEnv();
    assert.equal(sdk.config.database.url, validEnv.DATABASE_URL);
    assert.equal(sdk.config.redis.url, validEnv.REDIS_URL);
    assert.equal(sdk.config.auth.secret, validEnv.AUTH_SECRET);
    assert.equal(sdk.config.api.url, validEnv.API_URL);
    assert.equal(sdk.config.nodeEnv, "test");
  });

  it("validateAll returns full config", () => {
    applyValidEnv();
    const all = sdk.config.validateAll();
    assert.equal(all.database.url, validEnv.DATABASE_URL);
    assert.equal(all.nodeEnv, "test");
  });
});

describe("sdk.commands", () => {
  it("is a command bus that can register handlers", async () => {
    let handled = false;
    sdk.commands.register({
      commandType: "ApplyJob",
      handle: async () => {
        handled = true;
      },
    });

    await sdk.commands.dispatch({ type: "ApplyJob", userId: "u1", jobId: "j1" });
    assert.equal(handled, true);
  });
});
