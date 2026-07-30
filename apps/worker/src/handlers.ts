import {
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  RESUME_PARSE_JOB_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { matchJob } from "@autoapply/jobs";
import { createLogger } from "@autoapply/logger";
import { parseResume } from "@autoapply/resume";
import type { Job } from "bullmq";

const logger = createLogger("worker", { service: "worker" });

export interface WorkerHandlerDeps {
  parseResume: typeof parseResume;
  matchJob: typeof matchJob;
}

let handlerDeps: WorkerHandlerDeps = { parseResume, matchJob };

export function setWorkerHandlerDeps(deps: Partial<WorkerHandlerDeps>): void {
  handlerDeps = { ...handlerDeps, ...deps };
}

export function resetWorkerHandlerDeps(): void {
  handlerDeps = { parseResume, matchJob };
}

export async function handleHealthPingJob(job: Job<HealthPingJobData>): Promise<void> {
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
}

export async function handleResumeParseJob(job: Job<ResumeParseJobData>): Promise<void> {
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

  const parsed = await handlerDeps.parseResume({
    resumeId: job.data.resumeId,
    userId: job.data.userId,
  });
  jobLogger.info("Resume parse job completed", {
    jobId: job.id,
    resumeId: parsed.resumeId,
    skillCount: parsed.skills.length,
  });
}

export async function handleJobMatchJob(job: Job<JobMatchJobData>): Promise<void> {
  const jobLogger = logger.child({
    correlationId: job.data.correlationId,
    causationId: job.data.causationId,
  });

  if (job.name !== JOB_MATCH_JOB_NAME) {
    jobLogger.warn("Received unknown job", { name: job.name, id: job.id });
    return;
  }

  jobLogger.info("Processing job match", {
    queueJobId: job.id,
    jobId: job.data.jobId,
    userId: job.data.userId,
  });

  const matched = await handlerDeps.matchJob({
    jobId: job.data.jobId,
    userId: job.data.userId,
  });

  jobLogger.info("Job match completed", {
    queueJobId: job.id,
    jobId: matched.id,
    status: matched.status,
    score: matched.matchScore,
  });
}
