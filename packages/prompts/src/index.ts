import { createLogger } from "@autoapply/logger";

const logger = createLogger("prompts");

export async function getPrompt(name: string): Promise<string> {
  logger.warn("getPrompt not implemented", { name });
  throw new Error("Not implemented: getPrompt");
}
