export interface UpsertBrowserSessionRequest {
  /** Playwright storageState JSON string */
  storageStateJson: string;
}

export interface UpsertBrowserSessionResponse {
  provider: string;
  updatedAt: string;
}

export interface BrowserSessionStatusResponse {
  provider: string;
  configured: boolean;
  updatedAt: string | null;
}
