import {
  clearBrowserSession,
  loadBrowserSession,
  upsertBrowserSession,
} from "@autoapply/browser-session";

/** Local cache mirror of persisted encrypted sessions (plaintext JSON). */
export interface BrowserSessionRecord {
  userId: string;
  provider: string;
  cookies: string;
  updatedAt: string;
}

export interface BrowserSessionStore {
  load(userId: string, provider: string): Promise<BrowserSessionRecord | null>;
  save(record: BrowserSessionRecord): Promise<void>;
  clear(userId: string, provider: string): Promise<void>;
}

export class InMemoryBrowserSessionStore implements BrowserSessionStore {
  private readonly sessions = new Map<string, BrowserSessionRecord>();

  private key(userId: string, provider: string): string {
    return `${userId}:${provider}`;
  }

  async load(userId: string, provider: string): Promise<BrowserSessionRecord | null> {
    return this.sessions.get(this.key(userId, provider)) ?? null;
  }

  async save(record: BrowserSessionRecord): Promise<void> {
    this.sessions.set(this.key(record.userId, record.provider), record);
  }

  async clear(userId: string, provider: string): Promise<void> {
    this.sessions.delete(this.key(userId, provider));
  }
}

export class PostgresBrowserSessionStore implements BrowserSessionStore {
  async load(userId: string, provider: string): Promise<BrowserSessionRecord | null> {
    const storageStateJson = await loadBrowserSession(userId, provider);
    if (!storageStateJson) {
      return null;
    }
    return {
      userId,
      provider,
      cookies: storageStateJson,
      updatedAt: new Date().toISOString(),
    };
  }

  async save(record: BrowserSessionRecord): Promise<void> {
    await upsertBrowserSession({
      userId: record.userId,
      provider: record.provider,
      storageStateJson: record.cookies,
    });
  }

  async clear(userId: string, provider: string): Promise<void> {
    await clearBrowserSession(userId, provider);
  }
}
