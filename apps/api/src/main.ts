import "./load-env.js";

import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { parseEnv, apiEnvSchema, authEnvSchema, databaseEnvSchema, redisEnvSchema } from "@autoapply/config";
import { createLogger } from "@autoapply/shared";

import { AppModule } from "./app.module.js";

const logger = createLogger("api");

async function bootstrap(): Promise<void> {
  parseEnv(databaseEnvSchema);
  parseEnv(redisEnvSchema);
  parseEnv(authEnvSchema);
  const apiEnv = parseEnv(apiEnvSchema);

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: apiEnv.WEB_URL,
    credentials: true,
  });

  await app.listen(apiEnv.API_PORT);
  logger.info("API listening", { port: apiEnv.API_PORT });
}

bootstrap().catch((error: unknown) => {
  logger.error("Failed to start API", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
