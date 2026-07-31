import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PluginContext } from "@autoapply/contracts";

import { createLinkedInPlugin } from "../src/index.js";

class DenyPage {
  private currentUrl = "https://www.linkedin.com/login";

  goto = async (): Promise<void> => {
    this.currentUrl = "https://www.linkedin.com/login";
  };

  click = async (): Promise<void> => {};

  fill = async (): Promise<void> => {};

  textContent = async (): Promise<string | null> => null;

  url = (): string => this.currentUrl;

  waitForSelector = async (): Promise<void> => {};
}

describe("linkedin authenticate", () => {
  it("fails when session is expired", async () => {
    const plugin = createLinkedInPlugin();
    const ctx: PluginContext = { page: new DenyPage() };
    await assert.rejects(() => plugin.authenticate(ctx), /session expired/i);
  });
});

describe("linkedin executeApplication", () => {
  it("requires jobUrl metadata", async () => {
    const plugin = createLinkedInPlugin();
    const ctx: PluginContext = { page: new DenyPage() };
    await assert.rejects(
      () => plugin.executeApplication({ jobId: "j1", steps: [] }, ctx),
      /jobUrl is required/,
    );
  });
});
