import { createLogger } from "@autoapply/logger";

import { PrismaBrowserSessionRepository } from "./repository/prisma-browser-session.repository.js";
import type { BrowserSessionRepository } from "./repository/browser-session.repository.js";

const logger = createLogger("browser-session.domain");

let repository: BrowserSessionRepository = new PrismaBrowserSessionRepository();

export function setBrowserSessionRepository(repo: BrowserSessionRepository): void {
  repository = repo;
}

export function resetBrowserSessionRepository(): void {
  repository = new PrismaBrowserSessionRepository();
}

function parseStorageStateJson(storageStateJson: string): void {
  const trimmed = storageStateJson.trim();
  if (!trimmed) {
    throw new Error("storageStateJson is required");
  }
  try {
    JSON.parse(trimmed);
  } catch {
    throw new Error("storageStateJson must be valid JSON");
  }
}

export async function upsertBrowserSession(input: {
  userId: string;
  provider: string;
  storageStateJson: string;
}): Promise<{ provider: string; updatedAt: string }> {
  const provider = input.provider.trim();
  if (!provider) {
    throw new Error("provider is required");
  }
  parseStorageStateJson(input.storageStateJson);

  const record = await repository.upsert({
    userId: input.userId,
    provider,
    storageStateJson: input.storageStateJson.trim(),
  });

  logger.info("Browser session upserted", { userId: input.userId, provider });

  return {
    provider: record.provider,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function loadBrowserSession(
  userId: string,
  provider: string,
): Promise<string | null> {
  const record = await repository.findByUserAndProvider(userId, provider);
  return record?.storageStateJson ?? null;
}

export async function clearBrowserSession(userId: string, provider: string): Promise<boolean> {
  const cleared = await repository.delete(userId, provider);
  if (cleared) {
    logger.info("Browser session cleared", { userId, provider });
  }
  return cleared;
}

export async function getBrowserSessionStatus(
  userId: string,
  provider: string,
): Promise<{ configured: boolean; updatedAt: string | null }> {
  const record = await repository.findByUserAndProvider(userId, provider);
  return {
    configured: record !== null,
    updatedAt: record?.updatedAt.toISOString() ?? null,
  };
}
