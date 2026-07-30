import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPrompt, getPromptDefinition, listPromptNames, renderPrompt } from "../src/index.js";

describe("prompts", () => {
  it("lists registered prompts", () => {
    assert.deepEqual(listPromptNames(), ["job-match-rationale"]);
  });

  it("returns system text via getPrompt", async () => {
    const system = await getPrompt("job-match-rationale");
    assert.match(system, /career coach/i);
  });

  it("rejects unknown prompts", async () => {
    await assert.rejects(() => getPrompt("missing"), /Unknown prompt/);
  });

  it("renders template variables", () => {
    const def = getPromptDefinition("job-match-rationale");
    const rendered = renderPrompt(def.user, {
      title: "Engineer",
      company: "Acme",
      description: "Build things",
      resumeSummary: "Experienced builder",
      skills: "TypeScript, Node",
    });
    assert.match(rendered, /Engineer/);
    assert.match(rendered, /Acme/);
    assert.doesNotMatch(rendered, /\{\{/);
  });
});
