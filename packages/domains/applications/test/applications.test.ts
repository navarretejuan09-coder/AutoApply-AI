import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { queueApplication, submitApplication } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("queueApplication", () => {
  it("throws not implemented after logging", async () => {
    mock.method(console, "warn", () => {});
    await assert.rejects(
      () => queueApplication({ userId: "u1", jobId: "j1" }),
      /Not implemented: queueApplication/,
    );
  });
});

describe("submitApplication", () => {
  it("throws not implemented after logging", async () => {
    mock.method(console, "warn", () => {});
    await assert.rejects(
      () => submitApplication("app-1"),
      /Not implemented: submitApplication/,
    );
  });
});
