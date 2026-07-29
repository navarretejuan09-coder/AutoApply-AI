import "./load-env.js";

import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";

import { AppModule } from "./app.module.js";

const logger = createLogger("api", { service: "api" });

async function bootstrap(): Promise<void> {
  config.validateAll();

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: config.api.webUrl,
    credentials: true,
    exposedHeaders: ["x-correlation-id"],
  });

  await app.listen(config.api.port);
  logger.info("API listening", { port: config.api.port });
}

bootstrap().catch((error: unknown) => {
  logger.error("Failed to start API", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
