import type { ApplicationPlan, JobBoardPlugin } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

import { pluginManager } from "./plugin-manager.js";
import {
  InMemoryBrowserSessionStore,
  type BrowserSessionStore,
} from "./session-store.js";

const logger = createLogger("browser.runtime", { service: "browser" });

export interface BrowserRuntimeOptions {
  sessionStore?: BrowserSessionStore;
}

export class BrowserRuntime {
  private readonly sessionStore: BrowserSessionStore;

  constructor(options: BrowserRuntimeOptions = {}) {
    this.sessionStore = options.sessionStore ?? new InMemoryBrowserSessionStore();
  }

  async executeApplication(input: {
    userId: string;
    pluginName: string;
    plan: ApplicationPlan;
  }): Promise<void> {
    const plugin = pluginManager.load(input.pluginName);

    logger.info("Launching browser session", {
      userId: input.userId,
      plugin: input.pluginName,
    });

    const existing = await this.sessionStore.load(input.userId, input.pluginName);

    if (existing) {
      logger.info("Loaded persisted cookies", {
        userId: input.userId,
        plugin: input.pluginName,
      });
    }

    await this.runStatelessSession(plugin, input.plan);

    await this.sessionStore.save({
      userId: input.userId,
      provider: input.pluginName,
      cookies: "[]",
      updatedAt: new Date().toISOString(),
    });

    logger.info("Browser session closed and cookies saved", {
      userId: input.userId,
      plugin: input.pluginName,
    });
  }

  private async runStatelessSession(
    plugin: JobBoardPlugin,
    plan: ApplicationPlan,
  ): Promise<void> {
    await plugin.authenticate();
    await plugin.executeApplication(plan);
  }
}

export const browserRuntime = new BrowserRuntime();
