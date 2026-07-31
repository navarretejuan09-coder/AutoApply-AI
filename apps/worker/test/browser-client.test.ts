import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

process.env.BROWSER_INTERNAL_TOKEN ??= "browser-internal-token-for-tests";
process.env.COOKIE_ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString("base64");
process.env.BROWSER_URL ??= "http://localhost:3002";

import "../src/load-env.js";

import { postBrowserExecute } from "../src/browser-client.js";

describe("postBrowserExecute", () => {
  it("POSTs to browser /execute with internal token", async () => {
    const fetchMock = mock.fn(async () => ({
      ok: true,
      json: async () => ({ result: { success: true } }),
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await postBrowserExecute({
        userId: "u1",
        applicationId: "app-1",
        pluginName: "linkedin",
        plan: { jobId: "job-1", steps: [], metadata: { jobUrl: "https://example.com" } },
      });

      assert.equal(fetchMock.mock.callCount(), 1);
      const [url, init] = fetchMock.mock.calls[0]?.arguments as [string, RequestInit];
      assert.match(url, /\/execute$/);
      assert.equal(init.method, "POST");
      assert.ok(init.headers);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
