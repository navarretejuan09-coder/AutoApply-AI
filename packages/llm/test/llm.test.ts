import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { chat } from "../src/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

describe("llm.chat", () => {
  it("posts messages to Ollama /api/chat and returns assistant content", async () => {
    const fetchMock = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.match(String(input), /\/api\/chat$/);
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        messages: unknown[];
        stream: boolean;
      };
      assert.equal(body.stream, false);
      assert.equal(body.messages.length, 1);
      assert.ok(typeof body.model === "string" && body.model.length > 0);

      return new Response(
        JSON.stringify({ message: { role: "assistant", content: "  hello world  " } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await chat([{ role: "user", content: "hi" }]);
    assert.equal(result, "hello world");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("rejects empty message lists", async () => {
    await assert.rejects(() => chat([]), /at least one message/);
  });

  it("maps non-OK Ollama responses to errors", async () => {
    globalThis.fetch = mock.fn(async () => new Response("model not found", { status: 404 })) as typeof fetch;

    await assert.rejects(() => chat([{ role: "user", content: "hi" }]), /Ollama request failed \(404\)/);
  });
});
