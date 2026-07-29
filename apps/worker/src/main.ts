import "./load-env.js";

import { parseEnv, redisEnvSchema } from "@autoapply/config";
import { createLogger } from "@autoapply/shared";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  type HealthPingJobData,
} from "./queue.constants.js";

const logger = createLogger("worker");

parseEnv(redisEnvSchema);

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<HealthPingJobData>(
  HEALTH_QUEUE_NAME,
  async (job) => {
    if (job.name !== HEALTH_PING_JOB_NAME) {
      logger.warn("Received unknown job", { name: job.name, id: job.id });
      return;
    }

    logger.info("Processed health ping job", {
      jobId: job.id,
      source: job.data.source,
      timestamp: job.data.timestamp,
    });
  },
  { connection },
);

worker.on("failed", (job, error) => {
  logger.error("Job failed", {
    jobId: job?.id,
    error: error.message,
  });
});

logger.info("Worker started", { queue: HEALTH_QUEUE_NAME });

async function shutdown(): Promise<void> {
  logger.info("Shutting down worker");
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
