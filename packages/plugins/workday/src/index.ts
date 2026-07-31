import type { JobBoardPlugin } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("plugin.workday");

function notImplemented(method: string): never {
  logger.warn(`${method} not implemented`);
  throw new Error(`Not implemented: workday.${method}`);
}

export function createWorkdayPlugin(): JobBoardPlugin {
  return {
    name: "workday",
    authenticate: async (_ctx) => notImplemented("authenticate"),
    search: async () => notImplemented("search"),
    prepareApplication: async () => notImplemented("prepareApplication"),
    executeApplication: async (_plan, _ctx) => notImplemented("executeApplication"),
  };
}
