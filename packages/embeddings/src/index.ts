import { createLogger } from "@autoapply/logger";

const logger = createLogger("embeddings");

export async function embed(text: string): Promise<number[]> {
  logger.warn("embed not implemented", { length: text.length });
  throw new Error("Not implemented: embed");
}
