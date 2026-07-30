import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("llm.ollama");

const DEFAULT_TIMEOUT_MS = 60_000;

export class OllamaError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export async function ollamaPost<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const host = config.ai.host.replace(/\/$/, "");
  const url = `${host}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.error("Ollama request failed", {
        url,
        status: response.status,
        detail: detail.slice(0, 500),
      });
      throw new OllamaError(
        `Ollama request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof OllamaError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Ollama request timed out", { url, timeoutMs });
      throw new OllamaError(`Ollama request timed out after ${timeoutMs}ms`);
    }

    const message = error instanceof Error ? error.message : "Unknown Ollama error";
    logger.error("Ollama request error", { url, error: message });
    throw new OllamaError(
      `Cannot reach Ollama at ${host}. Is it running? (${message})`,
    );
  } finally {
    clearTimeout(timer);
  }
}
