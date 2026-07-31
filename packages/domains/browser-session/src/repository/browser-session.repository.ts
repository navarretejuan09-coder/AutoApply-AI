export interface BrowserSessionRecord {
  userId: string;
  provider: string;
  storageStateJson: string;
  updatedAt: Date;
}

export interface BrowserSessionRepository {
  upsert(input: {
    userId: string;
    provider: string;
    storageStateJson: string;
  }): Promise<BrowserSessionRecord>;
  findByUserAndProvider(userId: string, provider: string): Promise<BrowserSessionRecord | null>;
  delete(userId: string, provider: string): Promise<boolean>;
}
