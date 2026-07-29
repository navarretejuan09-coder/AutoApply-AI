import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string",
  );

const redisUrl = z
  .string()
  .min(1, "REDIS_URL is required")
  .refine(
    (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
    "REDIS_URL must be a Redis connection string",
  );

export const databaseEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
});

export const redisEnvSchema = z.object({
  REDIS_URL: redisUrl,
});

export const authEnvSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),
});

export const apiEnvSchema = z.object({
  API_URL: z.string().url("API_URL must be a valid URL"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url("WEB_URL must be a valid URL").default("http://localhost:3000"),
});

export const webEnvSchema = z.object({
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL must be a valid URL"),
});

export const ollamaEnvSchema = z.object({
  OLLAMA_HOST: z.string().url("OLLAMA_HOST must be a valid URL").optional(),
});

export const browserEnvSchema = z.object({
  BROWSER_PORT: z.coerce.number().int().positive().default(3002),
});

export const nodeEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const baseEnvSchema = databaseEnvSchema
  .merge(redisEnvSchema)
  .merge(authEnvSchema)
  .merge(apiEnvSchema)
  .merge(ollamaEnvSchema)
  .merge(browserEnvSchema)
  .merge(nodeEnvSchema);

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type BrowserEnv = z.infer<typeof browserEnvSchema>;
export type NodeEnv = z.infer<typeof nodeEnvSchema>;
export type OllamaEnv = z.infer<typeof ollamaEnvSchema>;
export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  return schema.parse(env);
}

export function parseBaseEnv(env: NodeJS.ProcessEnv = process.env): BaseEnv {
  return parseEnv(baseEnvSchema, env);
}
