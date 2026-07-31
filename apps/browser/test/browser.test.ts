import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.BROWSER_INTERNAL_TOKEN ??= "browser-internal-token-for-tests";
process.env.COOKIE_ENCRYPTION_KEY ??= Buffer.alloc(32, 2).toString("base64");
process.env.BROWSER_URL ??= "http://localhost:3002";

import "../src/load-env.js";

import type { ApplicationPlan, ApplicationResult, JobBoardPlugin, PluginContext } from "@autoapply/contracts";

import { BrowserRuntime } from "../src/runtime/runtime.js";
import { PluginManager } from "../src/runtime/plugin-manager.js";
import { InMemoryBrowserSessionStore } from "../src/runtime/session-store.js";

class StubPlugin implements JobBoardPlugin {
  readonly name = "test";
  readonly calls: string[] = [];

  async authenticate(_ctx: PluginContext): Promise<void> {
    this.calls.push("authenticate");
  }

  async search(): Promise<never[]> {
    return [];
  }

  async prepareApplication(jobId: string): Promise<ApplicationPlan> {
    return { jobId, steps: [] };
  }

  async executeApplication(_plan: ApplicationPlan, _ctx: PluginContext): Promise<ApplicationResult> {
    this.calls.push("executeApplication");
    return { success: true, applicationId: "ext-1" };
  }
}

describe("InMemoryBrowserSessionStore", () => {
  it("loads, saves, and clears sessions", async () => {
    const store = new InMemoryBrowserSessionStore();

    assert.equal(await store.load("u1", "linkedin"), null);

    await store.save({
      userId: "u1",
      provider: "linkedin",
      cookies: "[]",
      updatedAt: new Date().toISOString(),
    });

    const loaded = await store.load("u1", "linkedin");
    assert.equal(loaded?.provider, "linkedin");

    await store.clear("u1", "linkedin");
    assert.equal(await store.load("u1", "linkedin"), null);
  });
});

describe("PluginManager", () => {
  it("lists known plugins and loads by name", () => {
    const manager = new PluginManager();
    const names = manager.list();

    assert.ok(names.includes("linkedin"));
    assert.ok(names.includes("greenhouse"));

    const plugin = manager.load("linkedin");
    assert.equal(typeof plugin.authenticate, "function");
  });

  it("throws for unknown plugin names", () => {
    const manager = new PluginManager();
    assert.throws(() => manager.load("unknown-board"), /Unknown plugin/);
  });
});

describe("BrowserRuntime", () => {
  it("returns error when no session is configured", async () => {
    const runtime = new BrowserRuntime({ sessionStore: new InMemoryBrowserSessionStore() });
    const result = await runtime.executeApplication({
      userId: "u1",
      pluginName: "linkedin",
      plan: { jobId: "job-1", steps: ["easy_apply"], metadata: { jobUrl: "https://example.com" } },
    });

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /No browser session/);
  });

  it("runs plugin flow when launch succeeds", async () => {
    const store = new InMemoryBrowserSessionStore();
    const plugin = new StubPlugin();
    const manager = {
      load: () => plugin,
      list: () => ["test"],
    };

    const runtime = new BrowserRuntime({
      sessionStore: store,
      pluginManager: manager,
      saveEncryptedSession: async () => {},
      launchBrowser: async () =>
        ({
          newContext: async () => ({
            newPage: async () => ({
              goto: async () => {},
              click: async () => {},
              fill: async () => {},
              textContent: async () => null,
              url: () => "https://www.linkedin.com/feed/",
              waitForSelector: async () => {},
            }),
            storageState: async () => ({ cookies: [] }),
          }),
          close: async () => {},
        }) as never,
    });

    await store.save({
      userId: "u1",
      provider: "test",
      cookies: JSON.stringify({ cookies: [] }),
      updatedAt: new Date().toISOString(),
    });

    const result = await runtime.executeApplication({
      userId: "u1",
      pluginName: "test",
      plan: { jobId: "job-1", steps: ["fill-form"], metadata: { jobUrl: "https://example.com" } },
    });

    assert.deepEqual(plugin.calls, ["authenticate", "executeApplication"]);
    assert.equal(result.success, true);
  });

  it("returns failure when plugin throws", async () => {
    const store = new InMemoryBrowserSessionStore();
    const plugin: JobBoardPlugin = {
      name: "bad",
      authenticate: async () => {
        throw new Error("auth boom");
      },
      search: async () => [],
      prepareApplication: async (jobId) => ({ jobId, steps: [] }),
      executeApplication: async () => ({ success: true }),
    };
    const manager = { load: () => plugin, list: () => ["bad"] };
    const runtime = new BrowserRuntime({
      sessionStore: store,
      pluginManager: manager,
      saveEncryptedSession: async () => {},
      launchBrowser: async () =>
        ({
          newContext: async () => ({
            newPage: async () => ({
              goto: async () => {},
              click: async () => {},
              fill: async () => {},
              textContent: async () => null,
              url: () => "https://www.linkedin.com/feed/",
              waitForSelector: async () => {},
            }),
            storageState: async () => ({ cookies: [] }),
          }),
          close: async () => {},
        }) as never,
    });

    await store.save({
      userId: "u1",
      provider: "bad",
      cookies: JSON.stringify({ cookies: [] }),
      updatedAt: new Date().toISOString(),
    });

    const result = await runtime.executeApplication({
      userId: "u1",
      pluginName: "bad",
      plan: { jobId: "job-1", steps: [], metadata: { jobUrl: "https://example.com" } },
    });

    assert.equal(result.success, false);
    assert.match(result.error ?? "", /auth boom/);
  });
});
