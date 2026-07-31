import type { Page } from "playwright";

import type { BrowserPage } from "@autoapply/contracts";

export function createPlaywrightBrowserPage(page: Page): BrowserPage {
  return {
    goto: async (url: string) => {
      await page.goto(url);
    },
    click: async (selector: string) => {
      await page.click(selector);
    },
    fill: async (selector: string, value: string) => {
      await page.fill(selector, value);
    },
    textContent: async (selector: string) => page.textContent(selector),
    url: () => page.url(),
    waitForSelector: async (selector: string, options?: { timeout?: number }) => {
      await page.waitForSelector(selector, { timeout: options?.timeout });
    },
  };
}
