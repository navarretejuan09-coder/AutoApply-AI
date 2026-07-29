/** Encrypted cookie persistence (PostgreSQL) deferred to M4. */
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

/** Placeholder for M4 Postgres-backed encrypted cookie storage. */
export class PostgresBrowserSessionStore implements BrowserSessionStore {
  async load(userId: string, provider: string): Promise<BrowserSessionRecord | null> {
    throw new Error(`Not implemented: PostgresBrowserSessionStore.load (${userId}, ${provider})`);
  }

  async save(record: BrowserSessionRecord): Promise<void> {
    throw new Error(
      `Not implemented: PostgresBrowserSessionStore.save (${record.userId}, ${record.provider})`,
    );
  }

  async clear(userId: string, provider: string): Promise<void> {
    throw new Error(`Not implemented: PostgresBrowserSessionStore.clear (${userId}, ${provider})`);
  }
}
