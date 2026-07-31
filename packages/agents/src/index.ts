import { cosineSimilarity, embed } from "@autoapply/embeddings";
import { chat, type ChatMessage } from "@autoapply/llm";
import { createLogger } from "@autoapply/logger";
import { getPromptDefinition, renderPrompt, type PromptName } from "@autoapply/prompts";

const logger = createLogger("agents");

export interface JobMatchAgentInput {
  resumeText: string;
  resumeSummary: string;
  skills: string[];
  title: string;
  company: string;
  description: string;
}

export interface JobMatchAgentResult {
  score: number;
  rationale: string;
}

export interface JobMatchDeps {
  embed: (text: string) => Promise<number[]>;
  cosineSimilarity: (a: number[], b: number[]) => number;
  chat: (messages: ChatMessage[]) => Promise<string>;
}

const RATIONALE_MAX_CHARS = 400;

const defaultDeps: JobMatchDeps = {
  embed,
  cosineSimilarity,
  chat,
};

function clampScore(cosine: number): number {
  const raw = Math.round(cosine * 100);
  return Math.max(0, Math.min(100, raw));
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function createJobMatchAgent(deps: JobMatchDeps = defaultDeps) {
  return async (input: JobMatchAgentInput): Promise<JobMatchAgentResult> => {
    const jobText = [input.title, input.company, input.description].join("\n");
    const resumeText = input.resumeText.trim() || input.resumeSummary;

    const [resumeEmbedding, jobEmbedding] = await Promise.all([
      deps.embed(resumeText),
      deps.embed(jobText),
    ]);

    const score = clampScore(deps.cosineSimilarity(resumeEmbedding, jobEmbedding));

    const promptName: PromptName = "job-match-rationale";
    const prompt = getPromptDefinition(promptName);
    const userContent = renderPrompt(prompt.user, {
      title: input.title,
      company: input.company,
      description: input.description,
      resumeSummary: input.resumeSummary || resumeText.slice(0, 500),
      skills: input.skills.join(", ") || "none listed",
    });

    const messages: ChatMessage[] = [
      { role: "system", content: prompt.system },
      { role: "user", content: userContent },
    ];

    const rationale = truncate(await deps.chat(messages), RATIONALE_MAX_CHARS);

    logger.info("job-match agent completed", { score, rationaleLength: rationale.length });

    return { score, rationale };
  };
}

/** Production job-match agent (default Ollama deps). */
export const runJobMatch = createJobMatchAgent();
