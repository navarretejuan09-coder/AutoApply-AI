import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { BrowserPage, PluginContext } from "@autoapply/contracts";

import { createLinkedInPlugin } from "../src/index.js";

class FakePage implements BrowserPage {
  private currentUrl = "https://www.linkedin.com/feed/";
  private readonly htmlPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/easy-apply.html",
  );

  goto = async (url: string): Promise<void> => {
    this.currentUrl = url.startsWith("file:") ? url : `file://${this.htmlPath}`;
  };

  click = async (selector: string): Promise<void> => {
    if (selector.includes("easy-apply") && !selector.includes("submit") && !selector.includes("next")) {
      return;
    }
  };

  fill = async (): Promise<void> => {};

  textContent = async (): Promise<string | null> => null;

  url = (): string => this.currentUrl;

  waitForSelector = async (): Promise<void> => {};
}

describe("createLinkedInPlugin", () => {
  it("returns linkedin name", () => {
    assert.equal(createLinkedInPlugin().name, "linkedin");
  });

  it("completes fixture Easy Apply flow", async () => {
    const plugin = createLinkedInPlugin();
    const ctx: PluginContext = { page: new FakePage() };

    await plugin.authenticate(ctx);
    const result = await plugin.executeApplication(
      {
        jobId: "job-1",
        steps: ["easy_apply"],
        metadata: { jobUrl: "file://fixture/easy-apply.html" },
      },
      ctx,
    );

    assert.equal(result.success, true);
  });

  it("search remains not implemented", async () => {
    const plugin = createLinkedInPlugin();
    await assert.rejects(
      () => plugin.search({ keywords: ["engineer"] }),
      /Not implemented: linkedin.search/,
    );
  });

  it("prepareApplication returns plan metadata", async () => {
    const plugin = createLinkedInPlugin();
    const plan = await plugin.prepareApplication("job-99");
    assert.equal(plan.jobId, "job-99");
    assert.equal(plan.metadata?.provider, "linkedin");
  });
});
