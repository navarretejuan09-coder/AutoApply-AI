import type { JobBoardPlugin } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("plugin.linkedin");

function notImplemented(method: string): never {
  logger.warn(`${method} not implemented`);
  throw new Error(`Not implemented: linkedin.${method}`);
}

export function createLinkedInPlugin(): JobBoardPlugin {
  return {
    name: "linkedin",
    authenticate: async () => notImplemented("authenticate"),
    search: async () => notImplemented("search"),
    prepareApplication: async () => notImplemented("prepareApplication"),
    executeApplication: async () => notImplemented("executeApplication"),
  };
}
