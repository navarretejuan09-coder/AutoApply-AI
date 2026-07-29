import { createLogger } from "@autoapply/logger";

const logger = createLogger("llm");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  logger.warn("chat not implemented", { messageCount: messages.length });
  throw new Error("Not implemented: chat");
}
