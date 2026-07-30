import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { cosineSimilarity, embed } from "../src/index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
  });

  it("returns 0 for orthogonal vectors", () => {
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  });

  it("rejects mismatched lengths", () => {
    assert.throws(() => cosineSimilarity([1], [1, 2]), /length mismatch/);
  });
});

describe("embed", () => {
  it("posts prompt to Ollama /api/embeddings", async () => {
    const fetchMock = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.match(String(input), /\/api\/embeddings$/);
      const body = JSON.parse(String(init?.body)) as { model: string; prompt: string };
      assert.equal(body.prompt, "hello");
      assert.ok(body.model.length > 0);

      return new Response(JSON.stringify({ embedding: [0.1, 0.2, 0.3] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const vector = await embed("  hello  ");
    assert.deepEqual(vector, [0.1, 0.2, 0.3]);
  });

  it("rejects empty text", async () => {
    await assert.rejects(() => embed("   "), /non-empty text/);
  });
});
