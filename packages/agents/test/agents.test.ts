import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { resetJobMatchDeps, runAgent, setJobMatchDeps } from "../src/index.js";

afterEach(() => {
  resetJobMatchDeps();
});

describe("runAgent job-match", () => {
  it("scores with cosine similarity and returns LLM rationale", async () => {
    setJobMatchDeps({
      embed: async () => [1, 0],
      cosineSimilarity: () => 0.86,
      chat: async () => "  Strong overlap on TypeScript and NestJS.  ",
    });

    const result = (await runAgent("job-match", {
      resumeText: "Built NestJS APIs in TypeScript",
      resumeSummary: "Backend engineer",
      skills: ["TypeScript", "NestJS"],
      title: "Engineer",
      company: "Acme",
      description: "TypeScript NestJS role",
    })) as { score: number; rationale: string };

    assert.equal(result.score, 86);
    assert.equal(result.rationale, "Strong overlap on TypeScript and NestJS.");
  });

  it("clamps score between 0 and 100", async () => {
    setJobMatchDeps({
      embed: async () => [1],
      cosineSimilarity: () => 1.2,
      chat: async () => "Great fit",
    });

    const result = (await runAgent("job-match", {
      resumeText: "text",
      resumeSummary: "summary",
      skills: [],
      title: "T",
      company: "C",
      description: "D",
    })) as { score: number };

    assert.equal(result.score, 100);
  });

  it("rejects unknown agents", async () => {
    await assert.rejects(() => runAgent("nope", {}), /Unknown agent/);
  });

  it("rejects incomplete job-match input", async () => {
    await assert.rejects(() => runAgent("job-match", { title: "x" }), /requires resumeText/);
  });
});
