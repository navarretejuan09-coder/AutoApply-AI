import type { JobBoardPlugin } from "@autoapply/contracts";
import { createGreenhousePlugin } from "@autoapply/plugin-greenhouse";
import { createLeverPlugin } from "@autoapply/plugin-lever";
import { createLinkedInPlugin } from "@autoapply/plugin-linkedin";
import { createWorkdayPlugin } from "@autoapply/plugin-workday";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("browser.plugins", { service: "browser" });

const pluginFactories: Record<string, () => JobBoardPlugin> = {
  linkedin: createLinkedInPlugin,
  greenhouse: createGreenhousePlugin,
  lever: createLeverPlugin,
  workday: createWorkdayPlugin,
};

export class PluginManager {
  load(name: string): JobBoardPlugin {
    const factory = pluginFactories[name];

    if (!factory) {
      throw new Error(`Unknown plugin: ${name}`);
    }

    logger.info("Loaded plugin", { plugin: name });
    return factory();
  }

  list(): string[] {
    return Object.keys(pluginFactories);
  }
}

export const pluginManager = new PluginManager();
