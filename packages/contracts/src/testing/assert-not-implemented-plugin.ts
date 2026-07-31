import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import type { BrowserPage, JobBoardPlugin, PluginContext } from "../plugins/job-board.js";

function mockContext(): PluginContext {
  const page: BrowserPage = {
    goto: async () => {},
    click: async () => {},
    fill: async () => {},
    textContent: async () => null,
    url: () => "https://example.com",
    waitForSelector: async () => {},
  };
  return { page };
}

export function assertNotImplementedPlugin(createPlugin: () => JobBoardPlugin, name: string): void {
  const suiteName = `create${name.charAt(0).toUpperCase()}${name.slice(1)}Plugin`;

  describe(suiteName, () => {
    afterEach(() => {
      mock.restoreAll();
    });

    it(`returns a plugin named ${name}`, () => {
      const plugin = createPlugin();
      assert.equal(plugin.name, name);
    });

    it("authenticate throws not implemented", async () => {
      mock.method(console, "warn", () => {});
      const plugin = createPlugin();
      await assert.rejects(
        () => plugin.authenticate(mockContext()),
        new RegExp(`Not implemented: ${name}\\.authenticate`),
      );
    });

    it("search throws not implemented", async () => {
      mock.method(console, "warn", () => {});
      const plugin = createPlugin();
      await assert.rejects(
        () => plugin.search({ keywords: ["engineer"] }),
        new RegExp(`Not implemented: ${name}\\.search`),
      );
    });

    it("prepareApplication throws not implemented", async () => {
      mock.method(console, "warn", () => {});
      const plugin = createPlugin();
      await assert.rejects(
        () => plugin.prepareApplication("job-1"),
        new RegExp(`Not implemented: ${name}\\.prepareApplication`),
      );
    });

    it("executeApplication throws not implemented", async () => {
      mock.method(console, "warn", () => {});
      const plugin = createPlugin();
      await assert.rejects(
        () => plugin.executeApplication({ jobId: "job-1", steps: [] }, mockContext()),
        new RegExp(`Not implemented: ${name}\\.executeApplication`),
      );
    });
  });
}
