import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { config } from "../src/config.js";

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "x".repeat(32),
  API_URL: "http://localhost:3001",
  API_PORT: "3001",
  WEB_URL: "http://localhost:3000",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_URL: "http://localhost:3001",
  OLLAMA_HOST: "http://localhost:11434",
  BROWSER_PORT: "3002",
  NODE_ENV: "test",
} as const;

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function applyValidEnv(): void {
  for (const [key, value] of Object.entries(validEnv)) {
    process.env[key] = value;
  }
}

describe("ConfigService getters", () => {
  it("reads database url from env", () => {
    applyValidEnv();
    assert.deepEqual(config.database, { url: validEnv.DATABASE_URL });
  });

  it("reads redis url from env", () => {
    applyValidEnv();
    assert.deepEqual(config.redis, { url: validEnv.REDIS_URL });
  });

  it("reads auth secret from env", () => {
    applyValidEnv();
    assert.deepEqual(config.auth, { secret: validEnv.AUTH_SECRET });
  });

  it("reads api settings from env", () => {
    applyValidEnv();
    assert.deepEqual(config.api, {
      url: validEnv.API_URL,
      port: 3001,
      webUrl: validEnv.WEB_URL,
    });
  });

  it("reads web settings from env", () => {
    applyValidEnv();
    assert.deepEqual(config.web, {
      nextAuthUrl: validEnv.NEXTAUTH_URL,
      publicApiUrl: validEnv.NEXT_PUBLIC_API_URL,
    });
  });

  it("reads ai settings with defaults", () => {
    applyValidEnv();
    assert.deepEqual(config.ai, {
      host: validEnv.OLLAMA_HOST,
      chatModel: "llama3.2",
      embedModel: "nomic-embed-text",
    });
  });

  it("reads browser port from env", () => {
    applyValidEnv();
    assert.deepEqual(config.browser, { port: 3002 });
  });

  it("reads resume max bytes default", () => {
    applyValidEnv();
    assert.deepEqual(config.resume, { maxBytes: 5_242_880 });
  });

  it("reads nodeEnv from env", () => {
    applyValidEnv();
    assert.equal(config.nodeEnv, "test");
  });
});

describe("validateAll", () => {
  it("returns the full app config snapshot", () => {
    applyValidEnv();
    const all = config.validateAll();
    assert.equal(all.database.url, validEnv.DATABASE_URL);
    assert.equal(all.redis.url, validEnv.REDIS_URL);
    assert.equal(all.auth.secret, validEnv.AUTH_SECRET);
    assert.equal(all.api.port, 3001);
    assert.equal(all.nodeEnv, "test");
  });
});
