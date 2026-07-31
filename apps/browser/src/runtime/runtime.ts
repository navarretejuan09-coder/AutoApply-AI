import type { ApplicationPlan, ApplicationResult, JobBoardPlugin, PluginContext } from "@autoapply/contracts";
import { upsertBrowserSession } from "@autoapply/browser-session";
import { createLogger } from "@autoapply/logger";
import { chromium, type Browser } from "playwright";

import { config } from "@autoapply/config";

import { pluginManager as defaultPluginManager, type PluginManager } from "./plugin-manager.js";
import { createPlaywrightBrowserPage } from "./playwright-page-adapter.js";
import { InMemoryBrowserSessionStore, type BrowserSessionStore } from "./session-store.js";

const logger = createLogger("browser.runtime", { service: "browser" });

export interface BrowserRuntimeOptions {
  sessionStore?: BrowserSessionStore;
  pluginManager?: PluginManager;
  launchBrowser?: typeof chromium.launch;
  saveEncryptedSession?: (input: {
    userId: string;
    provider: string;
    storageStateJson: string;
  }) => Promise<void>;
}

export class BrowserRuntime {
  private readonly sessionStore: BrowserSessionStore;
  private readonly pluginManager: PluginManager;
  private readonly launchBrowser: typeof chromium.launch;
  private readonly saveEncryptedSession: (input: {
    userId: string;
    provider: string;
    storageStateJson: string;
  }) => Promise<void>;

  constructor(options: BrowserRuntimeOptions = {}) {
    this.sessionStore = options.sessionStore ?? new InMemoryBrowserSessionStore();
    this.pluginManager = options.pluginManager ?? defaultPluginManager;
    this.launchBrowser = options.launchBrowser ?? chromium.launch.bind(chromium);
    this.saveEncryptedSession =
      options.saveEncryptedSession ??
      (async (input) => {
        await upsertBrowserSession(input);
      });
  }

  async executeApplication(input: {
    userId: string;
    pluginName: string;
    plan: ApplicationPlan;
  }): Promise<ApplicationResult> {
    const plugin = this.pluginManager.load(input.pluginName);

    logger.info("Launching browser session", {
      userId: input.userId,
      plugin: input.pluginName,
    });

    const storageStateJson = await this.resolveStorageState(input.userId, input.pluginName);
    if (!storageStateJson) {
      return { success: false, error: "No browser session configured for provider" };
    }

    let browser: Browser | undefined;
    try {
      browser = await this.launchBrowser({ headless: config.browser.headless });
      const context = await browser.newContext({
        storageState: JSON.parse(storageStateJson) as never,
      });
      const page = await context.newPage();
      const ctx: PluginContext = { page: createPlaywrightBrowserPage(page) };

      await plugin.authenticate(ctx);
      const result = await plugin.executeApplication(input.plan, ctx);

      const updatedState = await context.storageState();
      const updatedStorageStateJson = JSON.stringify(updatedState);
      await this.saveEncryptedSession({
        userId: input.userId,
        provider: input.pluginName,
        storageStateJson: updatedStorageStateJson,
      });

      await this.sessionStore.save({
        userId: input.userId,
        provider: input.pluginName,
        cookies: updatedStorageStateJson,
        updatedAt: new Date().toISOString(),
      });

      logger.info("Browser session closed and cookies saved", {
        userId: input.userId,
        plugin: input.pluginName,
        success: result.success,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Browser execution failed";
      logger.warn("Browser execution error", { message, userId: input.userId });
      return { success: false, error: message };
    } finally {
      await browser?.close();
    }
  }

  private async resolveStorageState(userId: string, provider: string): Promise<string | null> {
    const fromStore = await this.sessionStore.load(userId, provider);
    return fromStore?.cookies ?? null;
  }
}

export const browserRuntime = new BrowserRuntime();
