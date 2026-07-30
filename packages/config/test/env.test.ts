import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  apiEnvSchema,
  authEnvSchema,
  baseEnvSchema,
  browserEnvSchema,
  databaseEnvSchema,
  nodeEnvSchema,
  ollamaEnvSchema,
  parseBaseEnv,
  parseEnv,
  redisEnvSchema,
  resumeEnvSchema,
  webEnvSchema,
} from "../src/env.js";

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
  OLLAMA_CHAT_MODEL: "llama3.2",
  OLLAMA_EMBED_MODEL: "nomic-embed-text",
  BROWSER_PORT: "3002",
  RESUME_MAX_BYTES: "5242880",
  NODE_ENV: "test",
} as const;

describe("databaseEnvSchema", () => {
  it("parses a postgres URL", () => {
    const parsed = parseEnv(databaseEnvSchema, {
      DATABASE_URL: validEnv.DATABASE_URL,
    });
    assert.equal(parsed.DATABASE_URL, validEnv.DATABASE_URL);
  });

  it("rejects non-postgres URLs", () => {
    assert.throws(
      () => parseEnv(databaseEnvSchema, { DATABASE_URL: "mysql://localhost/db" }),
      /PostgreSQL connection string/,
    );
  });
});

describe("redisEnvSchema", () => {
  it("parses a redis URL", () => {
    const parsed = parseEnv(redisEnvSchema, { REDIS_URL: validEnv.REDIS_URL });
    assert.equal(parsed.REDIS_URL, validEnv.REDIS_URL);
  });

  it("rejects invalid redis URLs", () => {
    assert.throws(
      () => parseEnv(redisEnvSchema, { REDIS_URL: "http://localhost" }),
      /Redis connection string/,
    );
  });
});

describe("authEnvSchema", () => {
  it("requires AUTH_SECRET of at least 32 characters", () => {
    const parsed = parseEnv(authEnvSchema, { AUTH_SECRET: validEnv.AUTH_SECRET });
    assert.equal(parsed.AUTH_SECRET.length, 32);
  });

  it("rejects short secrets", () => {
    assert.throws(
      () => parseEnv(authEnvSchema, { AUTH_SECRET: "too-short" }),
      /at least 32 characters/,
    );
  });
});

describe("apiEnvSchema", () => {
  it("coerces API_PORT and applies WEB_URL default", () => {
    const parsed = parseEnv(apiEnvSchema, {
      API_URL: validEnv.API_URL,
      API_PORT: "4000",
    });
    assert.equal(parsed.API_PORT, 4000);
    assert.equal(parsed.WEB_URL, "http://localhost:3000");
  });
});

describe("webEnvSchema", () => {
  it("parses auth URLs", () => {
    const parsed = parseEnv(webEnvSchema, {
      NEXTAUTH_URL: validEnv.NEXTAUTH_URL,
      NEXT_PUBLIC_API_URL: validEnv.NEXT_PUBLIC_API_URL,
    });
    assert.equal(parsed.NEXTAUTH_URL, validEnv.NEXTAUTH_URL);
  });
});

describe("ollamaEnvSchema", () => {
  it("applies defaults for optional fields", () => {
    const parsed = parseEnv(ollamaEnvSchema, {});
    assert.equal(parsed.OLLAMA_HOST, "http://localhost:11434");
    assert.equal(parsed.OLLAMA_CHAT_MODEL, "llama3.2");
    assert.equal(parsed.OLLAMA_EMBED_MODEL, "nomic-embed-text");
  });
});

describe("browserEnvSchema", () => {
  it("defaults BROWSER_PORT", () => {
    const parsed = parseEnv(browserEnvSchema, {});
    assert.equal(parsed.BROWSER_PORT, 3002);
  });
});

describe("resumeEnvSchema", () => {
  it("defaults RESUME_MAX_BYTES", () => {
    const parsed = parseEnv(resumeEnvSchema, {});
    assert.equal(parsed.RESUME_MAX_BYTES, 5_242_880);
  });
});

describe("nodeEnvSchema", () => {
  it("defaults NODE_ENV to development", () => {
    const parsed = parseEnv(nodeEnvSchema, {});
    assert.equal(parsed.NODE_ENV, "development");
  });

  it("accepts test and production", () => {
    assert.equal(parseEnv(nodeEnvSchema, { NODE_ENV: "test" }).NODE_ENV, "test");
    assert.equal(parseEnv(nodeEnvSchema, { NODE_ENV: "production" }).NODE_ENV, "production");
  });
});

describe("baseEnvSchema", () => {
  it("parses a complete valid environment", () => {
    const parsed = parseBaseEnv({ ...validEnv });
    assert.equal(parsed.DATABASE_URL, validEnv.DATABASE_URL);
    assert.equal(parsed.NODE_ENV, "test");
  });

  it("parseEnv works with baseEnvSchema directly", () => {
    const parsed = parseEnv(baseEnvSchema, { ...validEnv });
    assert.equal(parsed.REDIS_URL, validEnv.REDIS_URL);
  });
});
