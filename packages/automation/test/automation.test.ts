import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { runAutomation, scheduleAutomation } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

const mockPlugin = {
  name: "test-board",
  authenticate: async () => {},
  search: async () => [],
  prepareApplication: async () => ({ jobId: "j1", steps: [] }),
  executeApplication: async () => ({ success: true }),
};

describe("runAutomation", () => {
  it("throws not implemented after logging", async () => {
    const warnMock = mock.method(console, "warn", () => {});
    await assert.rejects(
      () =>
        runAutomation({
          plugin: mockPlugin,
          plan: { jobId: "j1", steps: ["fill-form"] },
        }),
      /Not implemented: runAutomation/,
    );
    assert.equal(warnMock.mock.calls.length, 1);
  });
});

describe("scheduleAutomation", () => {
  it("throws not implemented after logging", async () => {
    const warnMock = mock.method(console, "warn", () => {});
    await assert.rejects(
      () =>
        scheduleAutomation({
          userId: "u1",
          jobId: "j1",
          pluginName: "greenhouse",
        }),
      /Not implemented: scheduleAutomation/,
    );
    assert.equal(warnMock.mock.calls.length, 1);
  });
});
