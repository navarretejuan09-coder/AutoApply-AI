import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { ollamaPost } from "@autoapply/llm";

const logger = createLogger("embeddings");

export { cosineSimilarity } from "./cosine.js";

interface OllamaEmbedResponse {
  embedding?: number[];
  embeddings?: number[][];
  error?: string;
}

export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("embed requires non-empty text");
  }

  const model = config.ai.embedModel;

  logger.info("Calling Ollama embeddings", { model, length: trimmed.length });

  const data = await ollamaPost<OllamaEmbedResponse>("/api/embeddings", {
    model,
    prompt: trimmed,
  });

  const vector = data.embedding ?? data.embeddings?.[0];

  if (!vector || vector.length === 0) {
    throw new Error(data.error ?? "Ollama embeddings returned an empty vector");
  }

  return vector;
}
