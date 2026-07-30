import "./load-env.js";

import {
  HEALTH_QUEUE_NAME,
  JOB_QUEUE_NAME,
  RESUME_QUEUE_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

import { handleHealthPingJob, handleJobMatchJob, handleResumeParseJob } from "./handlers.js";

const logger = createLogger("worker", { service: "worker" });

config.validateAll();

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

const healthWorker = new Worker<HealthPingJobData>(HEALTH_QUEUE_NAME, handleHealthPingJob, {
  connection,
});

const resumeWorker = new Worker<ResumeParseJobData>(RESUME_QUEUE_NAME, handleResumeParseJob, {
  connection,
});

const jobsWorker = new Worker<JobMatchJobData>(JOB_QUEUE_NAME, handleJobMatchJob, { connection });

for (const worker of [healthWorker, resumeWorker, jobsWorker]) {
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
  queues: [HEALTH_QUEUE_NAME, RESUME_QUEUE_NAME, JOB_QUEUE_NAME],
});

async function shutdown(): Promise<void> {
  logger.info("Shutting down worker");
  await healthWorker.close();
  await resumeWorker.close();
  await jobsWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
