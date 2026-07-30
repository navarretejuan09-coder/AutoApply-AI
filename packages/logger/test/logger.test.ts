import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { createLogger } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("createLogger", () => {
  it("writes JSON logs to console.log for info", () => {
    const logMock = mock.method(console, "log", () => {});
    const logger = createLogger("test-service", { correlationId: "abc" });
    logger.info("started");

    assert.equal(logMock.mock.calls.length, 1);
    const entry = JSON.parse(String(logMock.mock.calls[0]?.arguments[0])) as {
      level: string;
      namespace: string;
      message: string;
      correlationId: string;
    };
    assert.equal(entry.level, "info");
    assert.equal(entry.namespace, "test-service");
    assert.equal(entry.message, "started");
    assert.equal(entry.correlationId, "abc");
  });

  it("writes warn and error to the matching console methods", () => {
    const warnMock = mock.method(console, "warn", () => {});
    const errorMock = mock.method(console, "error", () => {});
    const logger = createLogger("test-service");

    logger.warn("careful");
    logger.error("failed", { code: "E1" });

    assert.equal(warnMock.mock.calls.length, 1);
    assert.equal(errorMock.mock.calls.length, 1);
    const errorEntry = JSON.parse(String(errorMock.mock.calls[0]?.arguments[0])) as {
      level: string;
      code: string;
    };
    assert.equal(errorEntry.level, "error");
    assert.equal(errorEntry.code, "E1");
  });

  it("child merges context", () => {
    const logMock = mock.method(console, "log", () => {});
    const parent = createLogger("parent", { service: "api" });
    const child = parent.child({ correlationId: "child-1" });
    child.debug("nested");

    const entry = JSON.parse(String(logMock.mock.calls[0]?.arguments[0])) as {
      level: string;
      service: string;
      correlationId: string;
    };
    assert.equal(entry.level, "debug");
    assert.equal(entry.service, "api");
    assert.equal(entry.correlationId, "child-1");
  });
});
