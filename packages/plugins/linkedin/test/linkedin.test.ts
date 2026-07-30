import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { createLinkedInPlugin } from "../src/index.js";

afterEach(() => {
  mock.restoreAll();
});

describe("createLinkedInPlugin", () => {
  it("returns a plugin named linkedin", () => {
    const plugin = createLinkedInPlugin();
    assert.equal(plugin.name, "linkedin");
  });

  it("authenticate throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLinkedInPlugin();
    await assert.rejects(() => plugin.authenticate(), /Not implemented: linkedin.authenticate/);
  });

  it("search throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLinkedInPlugin();
    await assert.rejects(
      () => plugin.search({ keywords: ["pm"] }),
      /Not implemented: linkedin.search/,
    );
  });

  it("prepareApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLinkedInPlugin();
    await assert.rejects(
      () => plugin.prepareApplication("job-3"),
      /Not implemented: linkedin.prepareApplication/,
    );
  });

  it("executeApplication throws not implemented", async () => {
    mock.method(console, "warn", () => {});
    const plugin = createLinkedInPlugin();
    await assert.rejects(
      () => plugin.executeApplication({ jobId: "job-3", steps: [] }),
      /Not implemented: linkedin.executeApplication/,
    );
  });
});
