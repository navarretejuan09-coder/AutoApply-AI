import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("embeddings");

const DEFAULT_TIMEOUT_MS = 60_000;

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

  const host = config.ai.host.replace(/\/$/, "");
  const model = config.ai.embedModel;
  const url = `${host}/api/embeddings`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  logger.info("Calling Ollama embeddings", { model, length: trimmed.length });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: trimmed }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.error("Ollama embeddings failed", {
        url,
        status: response.status,
        detail: detail.slice(0, 500),
      });
      throw new Error(
        `Ollama embeddings failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    const vector = data.embedding ?? data.embeddings?.[0];

    if (!vector || vector.length === 0) {
      throw new Error(data.error ?? "Ollama embeddings returned an empty vector");
    }

    return vector;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama embeddings timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }

    if (error instanceof Error && error.message.startsWith("Ollama embeddings")) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown embeddings error";
    throw new Error(`Cannot reach Ollama at ${host}. Is it running? (${message})`);
  } finally {
    clearTimeout(timer);
  }
}
