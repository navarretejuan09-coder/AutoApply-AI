import "./load-env.js";

import {
  APPLICATION_QUEUE_NAME,
  HEALTH_QUEUE_NAME,
  JOB_QUEUE_NAME,
  RESUME_QUEUE_NAME,
  type ApplicationExecuteJobData,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

import {
  createApplicationExecuteHandler,
  createHealthPingHandler,
  createJobMatchHandler,
  createResumeParseHandler,
} from "./handlers.js";

const logger = createLogger("worker", { service: "worker" });

config.validateAll();

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
});

const healthWorker = new Worker<HealthPingJobData>(HEALTH_QUEUE_NAME, createHealthPingHandler(), {
  connection,
});

const resumeWorker = new Worker<ResumeParseJobData>(RESUME_QUEUE_NAME, createResumeParseHandler(), {
  connection,
});

const jobsWorker = new Worker<JobMatchJobData>(JOB_QUEUE_NAME, createJobMatchHandler(), {
  connection,
});

const applicationsWorker = new Worker<ApplicationExecuteJobData>(
  APPLICATION_QUEUE_NAME,
  createApplicationExecuteHandler(),
  { connection },
);

for (const worker of [healthWorker, resumeWorker, jobsWorker, applicationsWorker]) {
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
  queues: [HEALTH_QUEUE_NAME, RESUME_QUEUE_NAME, JOB_QUEUE_NAME, APPLICATION_QUEUE_NAME],
});

async function shutdown(): Promise<void> {
  logger.info("Shutting down worker");
  await healthWorker.close();
  await resumeWorker.close();
  await jobsWorker.close();
  await applicationsWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
