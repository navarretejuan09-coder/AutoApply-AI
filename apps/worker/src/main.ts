import "./load-env.js";

import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  type HealthPingJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

const logger = createLogger("worker", { service: "worker" });

config.validateAll();

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<HealthPingJobData>(
  HEALTH_QUEUE_NAME,
  async (job) => {
    const jobLogger = logger.child({
      correlationId: job.data.correlationId,
      causationId: job.data.causationId,
    });

    if (job.name !== HEALTH_PING_JOB_NAME) {
      jobLogger.warn("Received unknown job", { name: job.name, id: job.id });
      return;
    }

    jobLogger.info("Processed health ping job", {
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
    correlationId: job?.data.correlationId,
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
