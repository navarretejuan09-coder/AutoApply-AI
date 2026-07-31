import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as ai from "../src/index.js";

describe("ai barrel exports", () => {
  it("re-exports llm namespace", () => {
    assert.equal(typeof ai.llm.chat, "function");
    assert.equal(typeof ai.llm.OllamaError, "function");
  });

  it("re-exports embeddings namespace", () => {
    assert.equal(typeof ai.embeddings.embed, "function");
    assert.equal(typeof ai.embeddings.cosineSimilarity, "function");
  });

  it("re-exports agents namespace", () => {
    assert.equal(typeof ai.agents.runJobMatch, "function");
    assert.equal(typeof ai.agents.createJobMatchAgent, "function");
  });

  it("re-exports prompts namespace", () => {
    assert.equal(typeof ai.prompts.getPrompt, "function");
    assert.equal(typeof ai.prompts.getPromptDefinition, "function");
    assert.equal(typeof ai.prompts.renderPrompt, "function");
    assert.equal(typeof ai.prompts.listPromptNames, "function");
  });
});
