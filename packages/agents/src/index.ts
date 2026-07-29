import { createLogger } from "@autoapply/logger";

const logger = createLogger("agents");

export async function runAgent(name: string, input: Record<string, unknown>): Promise<unknown> {
  logger.warn("runAgent not implemented", { agent: name, input });
  throw new Error("Not implemented: runAgent");
}
