import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPlaywrightBrowserPage } from "../src/runtime/playwright-page-adapter.js";

describe("createPlaywrightBrowserPage", () => {
  it("delegates to underlying page methods", async () => {
    const calls: string[] = [];
    const page = {
      goto: async (url: string) => {
        calls.push(`goto:${url}`);
      },
      click: async (selector: string) => {
        calls.push(`click:${selector}`);
      },
      fill: async (selector: string, value: string) => {
        calls.push(`fill:${selector}:${value}`);
      },
      textContent: async () => "hello",
      url: () => "https://example.com",
      waitForSelector: async () => {
        calls.push("wait");
      },
    };

    const adapted = createPlaywrightBrowserPage(page as never);
    await adapted.goto("https://example.com");
    await adapted.click("#btn");
    await adapted.fill("#input", "x");
    assert.equal(await adapted.textContent("h1"), "hello");
    assert.equal(adapted.url(), "https://example.com");
    await adapted.waitForSelector("#btn", { timeout: 1000 });

    assert.deepEqual(calls, ["goto:https://example.com", "click:#btn", "fill:#input:x", "wait"]);
  });
});
