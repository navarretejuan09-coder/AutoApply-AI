import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { createGreenhousePlugin } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("createGreenhousePlugin", () => {
  it("returns a plugin named greenhouse", () => {
    const plugin = createGreenhousePlugin();
    assert.equal(plugin.name, "greenhouse");
  });

  it("authenticate throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createGreenhousePlugin();
    await assert.rejects(() => plugin.authenticate(), /Not implemented: greenhouse.authenticate/);
  });

  it("search throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createGreenhousePlugin();
    await assert.rejects(
      () => plugin.search({ keywords: ["engineer"] }),
      /Not implemented: greenhouse.search/,
    );
  });

  it("prepareApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createGreenhousePlugin();
    await assert.rejects(
      () => plugin.prepareApplication("job-1"),
      /Not implemented: greenhouse.prepareApplication/,
    );
  });

  it("executeApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createGreenhousePlugin();
    await assert.rejects(
      () => plugin.executeApplication({ jobId: "job-1", steps: [] }),
      /Not implemented: greenhouse.executeApplication/,
    );
  });
});
