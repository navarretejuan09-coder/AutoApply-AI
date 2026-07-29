import "./load-env.js";

import { chromium } from "playwright";

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("about:blank");
  await browser.close();
  console.log("Playwright smoke test passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
