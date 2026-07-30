import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { createLeverPlugin } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("createLeverPlugin", () => {
  it("returns a plugin named lever", () => {
    const plugin = createLeverPlugin();
    assert.equal(plugin.name, "lever");
  });

  it("authenticate throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLeverPlugin();
    await assert.rejects(() => plugin.authenticate(), /Not implemented: lever.authenticate/);
  });

  it("search throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLeverPlugin();
    await assert.rejects(
      () => plugin.search({ keywords: ["designer"] }),
      /Not implemented: lever.search/,
    );
  });

  it("prepareApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLeverPlugin();
    await assert.rejects(
      () => plugin.prepareApplication("job-2"),
      /Not implemented: lever.prepareApplication/,
    );
  });

  it("executeApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLeverPlugin();
    await assert.rejects(
      () => plugin.executeApplication({ jobId: "job-2", steps: [] }),
      /Not implemented: lever.executeApplication/,
    );
  });
});
