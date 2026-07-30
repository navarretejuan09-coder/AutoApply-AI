import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "../src/load-env.js";

import type { ApplicationPlan, JobBoardPlugin } from "@autoapply/contracts";

import { BrowserRuntime } from "../src/runtime/runtime.js";
import { PluginManager } from "../src/runtime/plugin-manager.js";
import {
  InMemoryBrowserSessionStore,
  PostgresBrowserSessionStore,
} from "../src/runtime/session-store.js";

class StubPlugin implements JobBoardPlugin {
  readonly calls: string[] = [];

  async authenticate(): Promise<void> {
    this.calls.push("authenticate");
  }

  async executeApplication(_plan: ApplicationPlan): Promise<void> {
    this.calls.push("executeApplication");
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

describe("PostgresBrowserSessionStore", () => {
  it("throws not implemented for all methods", async () => {
    const store = new PostgresBrowserSessionStore();

    await assert.rejects(() => store.load("u1", "linkedin"), /Not implemented/);
    await assert.rejects(
      () =>
        store.save({
          userId: "u1",
          provider: "linkedin",
          cookies: "[]",
          updatedAt: new Date().toISOString(),
        }),
      /Not implemented/,
    );
    await assert.rejects(() => store.clear("u1", "linkedin"), /Not implemented/);
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
  it("runs plugin flow and persists session cookies", async () => {
    const store = new InMemoryBrowserSessionStore();
    const plugin = new StubPlugin();
    const manager = {
      load: () => plugin,
      list: () => ["test"],
    };
    const runtime = new BrowserRuntime({ sessionStore: store, pluginManager: manager });

    await store.save({
      userId: "u1",
      provider: "test",
      cookies: "[existing]",
      updatedAt: new Date().toISOString(),
    });

    await runtime.executeApplication({
      userId: "u1",
      pluginName: "test",
      plan: { jobId: "job-1", steps: ["fill-form"] },
    });

    assert.deepEqual(plugin.calls, ["authenticate", "executeApplication"]);

    const saved = await store.load("u1", "test");
    assert.equal(saved?.cookies, "[]");
  });
});
