import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { trackEvent } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("trackEvent", () => {
  it("logs a warning and resolves without throwing", async () => {
    const warnMock = mock.method(console, "warn", () => {});
    await trackEvent("page.view", { path: "/dashboard" });
    assert.equal(warnMock.mock.calls.length, 1);
    const entry = JSON.parse(String(warnMock.mock.calls[0]?.arguments[0])) as {
      message: string;
      event: string;
    };
    assert.equal(entry.message, "trackEvent not implemented");
    assert.equal(entry.event, "page.view");
  });
});
