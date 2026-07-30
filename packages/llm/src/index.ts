import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";

import { ollamaPost } from "./ollama-client.js";

const logger = createLogger("llm");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
}

interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  error?: string;
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  if (messages.length === 0) {
    throw new Error("chat requires at least one message");
  }

  const model = options.model ?? config.ai.chatModel;

  logger.info("Calling Ollama chat", { model, messageCount: messages.length });

  const payload: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };

  if (options.temperature !== undefined) {
    payload.options = { temperature: options.temperature };
  }

  const data = await ollamaPost<OllamaChatResponse>("/api/chat", payload);
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error(data.error ?? "Ollama chat returned an empty response");
  }

  return content;
}

export { OllamaError } from "./ollama-client.js";
