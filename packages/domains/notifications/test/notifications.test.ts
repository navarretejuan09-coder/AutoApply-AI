import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { notifyUser } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("notifyUser", () => {
  it("logs a warning and resolves without throwing", async () => {
    const warnMock = mock.method(console, "warn", () => {});
    await notifyUser("user-1", "Your application was submitted", "email");
    assert.equal(warnMock.mock.calls.length, 1);
    const entry = JSON.parse(String(warnMock.mock.calls[0]?.arguments[0])) as {
      level: string;
      userId: string;
      channel: string;
    };
    assert.equal(entry.level, "warn");
    assert.equal(entry.userId, "user-1");
    assert.equal(entry.channel, "email");
  });
});
