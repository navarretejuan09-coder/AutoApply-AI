import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { createWorkdayPlugin } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("createWorkdayPlugin", () => {
  it("returns a plugin named workday", () => {
    const plugin = createWorkdayPlugin();
    assert.equal(plugin.name, "workday");
  });

  it("authenticate throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createWorkdayPlugin();
    await assert.rejects(() => plugin.authenticate(), /Not implemented: workday.authenticate/);
  });

  it("search throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createWorkdayPlugin();
    await assert.rejects(
      () => plugin.search({ keywords: ["analyst"] }),
      /Not implemented: workday.search/,
    );
  });

  it("prepareApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createWorkdayPlugin();
    await assert.rejects(
      () => plugin.prepareApplication("job-4"),
      /Not implemented: workday.prepareApplication/,
    );
  });

  it("executeApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createWorkdayPlugin();
    await assert.rejects(
      () => plugin.executeApplication({ jobId: "job-4", steps: [] }),
      /Not implemented: workday.executeApplication/,
    );
  });
});
