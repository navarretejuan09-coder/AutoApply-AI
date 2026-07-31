import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createJobMatchAgent, runJobMatch } from "../src/index.js";

const sampleInput = {
  resumeText: "Built NestJS APIs in TypeScript",
  resumeSummary: "Backend engineer",
  skills: ["TypeScript", "NestJS"],
  title: "Engineer",
  company: "Acme",
  description: "TypeScript NestJS role",
};

describe("runJobMatch", () => {
  it("scores with cosine similarity and returns LLM rationale", async () => {
    const match = createJobMatchAgent({
      embed: async () => [1, 0],
      cosineSimilarity: () => 0.86,
      chat: async () => "  Strong overlap on TypeScript and NestJS.  ",
    });

    const result = await match(sampleInput);

    assert.equal(result.score, 86);
    assert.equal(result.rationale, "Strong overlap on TypeScript and NestJS.");
  });

  it("clamps score between 0 and 100", async () => {
    const match = createJobMatchAgent({
      embed: async () => [1],
      cosineSimilarity: () => 1.2,
      chat: async () => "Great fit",
    });

    const result = await match({
      resumeText: "text",
      resumeSummary: "summary",
      skills: [],
      title: "T",
      company: "C",
      description: "D",
    });

    assert.equal(result.score, 100);
  });

  it("exports a production runJobMatch function", () => {
    assert.equal(typeof runJobMatch, "function");
  });
});
