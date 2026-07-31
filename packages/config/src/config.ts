import {
  apiEnvSchema,
  authEnvSchema,
  browserEnvSchema,
  cookieEncryptionEnvSchema,
  databaseEnvSchema,
  nodeEnvSchema,
  ollamaEnvSchema,
  parseEnv,
  redisEnvSchema,
  resumeEnvSchema,
  webEnvSchema,
  type ApiEnv,
  type AuthEnv,
  type BrowserEnv,
  type CookieEncryptionEnv,
  type DatabaseEnv,
  type NodeEnv,
  type OllamaEnv,
  type RedisEnv,
  type ResumeEnv,
  type WebEnv,
} from "./env.js";

export interface AppConfig {
  database: { url: string };
  redis: { url: string };
  auth: { secret: string };
  api: { url: string; port: number; webUrl: string };
  web: { nextAuthUrl: string; publicApiUrl: string };
  ai: { host: string; chatModel: string; embedModel: string };
  browser: {
    port: number;
    url: string;
    headless: boolean;
    internalToken: string;
  };
  cookieEncryption: { key: Buffer };
  resume: { maxBytes: number };
  nodeEnv: "development" | "test" | "production";
}

class ConfigService {
  private databaseEnv?: DatabaseEnv;
  private redisEnv?: RedisEnv;
  private authEnv?: AuthEnv;
  private apiEnv?: ApiEnv;
  private webEnv?: WebEnv;
  private ollamaEnv?: OllamaEnv;
  private browserEnv?: BrowserEnv;
  private cookieEncryptionEnv?: CookieEncryptionEnv;
  private resumeEnv?: ResumeEnv;
  private nodeEnvValue?: NodeEnv;

  get database(): AppConfig["database"] {
    this.databaseEnv ??= parseEnv(databaseEnvSchema);
    return { url: this.databaseEnv.DATABASE_URL };
  }

  get redis(): AppConfig["redis"] {
    this.redisEnv ??= parseEnv(redisEnvSchema);
    return { url: this.redisEnv.REDIS_URL };
  }

  get auth(): AppConfig["auth"] {
    this.authEnv ??= parseEnv(authEnvSchema);
    return { secret: this.authEnv.AUTH_SECRET };
  }

  get api(): AppConfig["api"] {
    this.apiEnv ??= parseEnv(apiEnvSchema);
    return {
      url: this.apiEnv.API_URL,
      port: this.apiEnv.API_PORT,
      webUrl: this.apiEnv.WEB_URL,
    };
  }

  get web(): AppConfig["web"] {
    this.webEnv ??= parseEnv(webEnvSchema);
    return {
      nextAuthUrl: this.webEnv.NEXTAUTH_URL,
      publicApiUrl: this.webEnv.NEXT_PUBLIC_API_URL,
    };
  }

  get ai(): AppConfig["ai"] {
    this.ollamaEnv ??= parseEnv(ollamaEnvSchema);
    return {
      host: this.ollamaEnv.OLLAMA_HOST,
      chatModel: this.ollamaEnv.OLLAMA_CHAT_MODEL,
      embedModel: this.ollamaEnv.OLLAMA_EMBED_MODEL,
    };
  }

  get browser(): AppConfig["browser"] {
    this.browserEnv ??= parseEnv(browserEnvSchema);
    return {
      port: this.browserEnv.BROWSER_PORT,
      url: this.browserEnv.BROWSER_URL,
      headless: this.browserEnv.BROWSER_HEADLESS,
      internalToken: this.browserEnv.BROWSER_INTERNAL_TOKEN,
    };
  }

  get cookieEncryption(): AppConfig["cookieEncryption"] {
    this.cookieEncryptionEnv ??= parseEnv(cookieEncryptionEnvSchema);
    return {
      key: Buffer.from(this.cookieEncryptionEnv.COOKIE_ENCRYPTION_KEY, "base64"),
    };
  }

  get resume(): AppConfig["resume"] {
    this.resumeEnv ??= parseEnv(resumeEnvSchema);
    return { maxBytes: this.resumeEnv.RESUME_MAX_BYTES };
  }

  get nodeEnv(): AppConfig["nodeEnv"] {
    this.nodeEnvValue ??= parseEnv(nodeEnvSchema);
    return this.nodeEnvValue.NODE_ENV;
  }

  /** Validate all known env vars (use at full-stack bootstrap). */
  validateAll(): AppConfig {
    return {
      database: this.database,
      redis: this.redis,
      auth: this.auth,
      api: this.api,
      web: this.web,
      ai: this.ai,
      browser: this.browser,
      cookieEncryption: this.cookieEncryption,
      resume: this.resume,
      nodeEnv: this.nodeEnv,
    };
  }
}

export const config = new ConfigService();
