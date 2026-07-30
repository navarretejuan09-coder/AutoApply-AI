import "./load-env.js";

import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  RESUME_PARSE_JOB_NAME,
  RESUME_QUEUE_NAME,
  type HealthPingJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { parseResume } from "@autoapply/resume";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

const logger = createLogger("worker", { service: "worker" });

config.validateAll();

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

const healthWorker = new Worker<HealthPingJobData>(
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

const resumeWorker = new Worker<ResumeParseJobData>(
  RESUME_QUEUE_NAME,
  async (job) => {
    const jobLogger = logger.child({
      correlationId: job.data.correlationId,
      causationId: job.data.causationId,
    });

    if (job.name !== RESUME_PARSE_JOB_NAME) {
      jobLogger.warn("Received unknown job", { name: job.name, id: job.id });
      return;
    }

    jobLogger.info("Processing resume parse job", {
      jobId: job.id,
      resumeId: job.data.resumeId,
      userId: job.data.userId,
    });

    const parsed = await parseResume({
      resumeId: job.data.resumeId,
      userId: job.data.userId,
    });
    jobLogger.info("Resume parse job completed", {
      jobId: job.id,
      resumeId: parsed.resumeId,
      skillCount: parsed.skills.length,
    });
  },
  { connection },
);

for (const worker of [healthWorker, resumeWorker]) {
  worker.on("failed", (job, error) => {
    logger.error("Job failed", {
      queue: worker.name,
      jobId: job?.id,
      correlationId: job?.data?.correlationId,
      error: error.message,
    });
  });
}

logger.info("Worker started", {
  queues: [HEALTH_QUEUE_NAME, RESUME_QUEUE_NAME],
});

async function shutdown(): Promise<void> {
  logger.info("Shutting down worker");
  await healthWorker.close();
  await resumeWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
