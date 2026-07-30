import { createLogger } from "@autoapply/logger";

const logger = createLogger("prompts");

export type PromptName = "job-match-rationale";

export interface PromptDefinition {
  name: PromptName;
  system: string;
  user: string;
}

const PROMPTS: Record<PromptName, PromptDefinition> = {
  "job-match-rationale": {
    name: "job-match-rationale",
    system:
      "You are a careful career coach. Explain briefly why a candidate may or may not fit a job. Be specific, honest, and under 80 words. Do not invent skills the resume does not mention.",
    user: `Job title: {{title}}
Company: {{company}}
Job description:
{{description}}

Candidate summary:
{{resumeSummary}}

Candidate skills: {{skills}}

Write a short match rationale.`,
  },
};

export async function getPrompt(name: string): Promise<string> {
  const prompt = PROMPTS[name as PromptName];
  if (!prompt) {
    logger.warn("Unknown prompt requested", { name });
    throw new Error(`Unknown prompt: ${name}`);
  }

  return prompt.system;
}

export function getPromptDefinition(name: PromptName): PromptDefinition {
  return PROMPTS[name];
}

export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? "";
  });
}

export function listPromptNames(): PromptName[] {
  return Object.keys(PROMPTS) as PromptName[];
}
