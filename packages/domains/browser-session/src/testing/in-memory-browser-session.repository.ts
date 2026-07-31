import type { BrowserSessionRepository } from "../repository/browser-session.repository.js";

export class InMemoryBrowserSessionRepository implements BrowserSessionRepository {
  private readonly store = new Map<string, { storageStateJson: string; updatedAt: Date }>();

  private key(userId: string, provider: string): string {
    return `${userId}:${provider}`;
  }

  async upsert(input: {
    userId: string;
    provider: string;
    storageStateJson: string;
  }): Promise<import("../repository/browser-session.repository.js").BrowserSessionRecord> {
    const updatedAt = new Date();
    this.store.set(this.key(input.userId, input.provider), {
      storageStateJson: input.storageStateJson,
      updatedAt,
    });
    return {
      userId: input.userId,
      provider: input.provider,
      storageStateJson: input.storageStateJson,
      updatedAt,
    };
  }

  async findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<import("../repository/browser-session.repository.js").BrowserSessionRecord | null> {
    const entry = this.store.get(this.key(userId, provider));
    if (!entry) {
      return null;
    }
    return {
      userId,
      provider,
      storageStateJson: entry.storageStateJson,
      updatedAt: entry.updatedAt,
    };
  }

  async delete(userId: string, provider: string): Promise<boolean> {
    return this.store.delete(this.key(userId, provider));
  }
}
