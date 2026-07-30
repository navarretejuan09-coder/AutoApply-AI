import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import { z } from "zod";

import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  createLogger,
  formatZodError,
  parseOrThrow,
} from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("AppError hierarchy", () => {
  it("AppError stores code and statusCode", () => {
    const error = new AppError("boom", "BOOM", 418);
    assert.equal(error.message, "boom");
    assert.equal(error.code, "BOOM");
    assert.equal(error.statusCode, 418);
    assert.equal(error.name, "AppError");
  });

  it("NotFoundError defaults to 404", () => {
    const error = new NotFoundError();
    assert.equal(error.code, "NOT_FOUND");
    assert.equal(error.statusCode, 404);
    assert.equal(error.name, "NotFoundError");
  });

  it("UnauthorizedError defaults to 401", () => {
    const error = new UnauthorizedError();
    assert.equal(error.code, "UNAUTHORIZED");
    assert.equal(error.statusCode, 401);
    assert.equal(error.name, "UnauthorizedError");
  });

  it("ValidationError stores details", () => {
    const details = { field: "email" };
    const error = new ValidationError("bad input", details);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(error.statusCode, 400);
    assert.equal(error.details, details);
    assert.equal(error.name, "ValidationError");
  });
});

describe("parseOrThrow", () => {
  const schema = z.object({ email: z.string().email() });

  it("returns parsed data on success", () => {
    const data = parseOrThrow(schema, { email: "user@example.com" });
    assert.equal(data.email, "user@example.com");
  });

  it("throws ValidationError on failure", () => {
    assert.throws(() => parseOrThrow(schema, { email: "not-an-email" }), ValidationError);
  });
});

describe("formatZodError", () => {
  it("joins issue messages with semicolons", () => {
    const result = z.string().min(3).safeParse("a");
    assert.ok(!result.success);
    const formatted = formatZodError(result.error);
    assert.match(formatted, /String must contain at least 3 character/);
  });
});

describe("createLogger re-export", () => {
  it("creates a logger from the shared barrel", () => {
    const logMock = mock.method(console, "log", () => {});
    const logger = createLogger("shared-test");
    logger.info("hello", { key: "value" });
    assert.equal(logMock.mock.calls.length, 1);
    const line = JSON.parse(String(logMock.mock.calls[0]?.arguments[0])) as {
      level: string;
      namespace: string;
      message: string;
      key: string;
    };
    assert.equal(line.level, "info");
    assert.equal(line.namespace, "shared-test");
    assert.equal(line.message, "hello");
    assert.equal(line.key, "value");
  });
});
