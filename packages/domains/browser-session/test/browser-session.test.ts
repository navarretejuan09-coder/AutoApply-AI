import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  resetBrowserSessionRepository,
  setBrowserSessionRepository,
  loadBrowserSession,
  clearBrowserSession,
  getBrowserSessionStatus,
  upsertBrowserSession,
} from "../src/index.js";
import { InMemoryBrowserSessionRepository } from "../src/testing/in-memory-browser-session.repository.js";
import { decryptPlaintext, encryptPlaintext } from "../src/crypto.js";

afterEach(() => {
  resetBrowserSessionRepository();
});

describe("browser-session crypto", () => {
  const key = Buffer.alloc(32, 7);

  it("round-trips plaintext", () => {
    const plaintext = '{"cookies":[{"name":"li_at","value":"abc"}]}';
    const encrypted = encryptPlaintext(plaintext, key);
    const decrypted = decryptPlaintext(encrypted, key);
    assert.equal(decrypted, plaintext);
  });

  it("rejects wrong key length", () => {
    assert.throws(() => encryptPlaintext("x", Buffer.alloc(16)), /32 bytes/);
  });
});

describe("upsertBrowserSession", () => {
  it("validates JSON and upserts via repository", async () => {
    setBrowserSessionRepository(new InMemoryBrowserSessionRepository());
    const result = await upsertBrowserSession({
      userId: "u1",
      provider: "linkedin",
      storageStateJson: '{"cookies":[]}',
    });
    assert.equal(result.provider, "linkedin");
  });

  it("rejects invalid JSON", async () => {
    setBrowserSessionRepository(new InMemoryBrowserSessionRepository());
    await assert.rejects(
      () =>
        upsertBrowserSession({
          userId: "u1",
          provider: "linkedin",
          storageStateJson: "not-json",
        }),
      /valid JSON/,
    );
  });

  it("loads, clears, and reports status", async () => {
    setBrowserSessionRepository(new InMemoryBrowserSessionRepository());
    await upsertBrowserSession({
      userId: "u1",
      provider: "linkedin",
      storageStateJson: '{"cookies":[{"name":"li_at"}]}',
    });
    const loaded = await loadBrowserSession("u1", "linkedin");
    assert.ok(loaded?.includes("li_at"));
    const status = await getBrowserSessionStatus("u1", "linkedin");
    assert.equal(status.configured, true);
    await clearBrowserSession("u1", "linkedin");
    assert.equal(await loadBrowserSession("u1", "linkedin"), null);
  });
});
