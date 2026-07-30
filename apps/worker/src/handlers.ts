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

type JobLogger = ReturnType<typeof logger.child>;

type CorrelatedJobData = {
  correlationId: string;
  causationId: string;
};

function createNamedHandler<T extends CorrelatedJobData>(
  expectedName: string,
  run: (job: Job<T>, jobLogger: JobLogger) => Promise<void>,
) {
  return async (job: Job<T>): Promise<void> => {
    const jobLogger = logger.child({
      correlationId: job.data.correlationId,
      causationId: job.data.causationId,
    });

    if (job.name !== expectedName) {
      jobLogger.warn("Received unknown job", { name: job.name, id: job.id });
      return;
    }

    await run(job, jobLogger);
  };
}

export function createHealthPingHandler() {
  return createNamedHandler<HealthPingJobData>(HEALTH_PING_JOB_NAME, async (job, jobLogger) => {
    jobLogger.info("Processed health ping job", {
      jobId: job.id,
      source: job.data.source,
      timestamp: job.data.timestamp,
    });
  });
}

export function createResumeParseHandler(parseResumeFn: typeof parseResume = parseResume) {
  return createNamedHandler<ResumeParseJobData>(RESUME_PARSE_JOB_NAME, async (job, jobLogger) => {
    jobLogger.info("Processing resume parse job", {
      jobId: job.id,
      resumeId: job.data.resumeId,
      userId: job.data.userId,
    });

    const parsed = await parseResumeFn({
      resumeId: job.data.resumeId,
      userId: job.data.userId,
    });

    jobLogger.info("Resume parse job completed", {
      jobId: job.id,
      resumeId: parsed.resumeId,
      skillCount: parsed.skills.length,
    });
  });
}

export function createJobMatchHandler(matchJobFn: typeof matchJob = matchJob) {
  return createNamedHandler<JobMatchJobData>(JOB_MATCH_JOB_NAME, async (job, jobLogger) => {
    jobLogger.info("Processing job match", {
      queueJobId: job.id,
      jobId: job.data.jobId,
      userId: job.data.userId,
    });

    const matched = await matchJobFn({
      jobId: job.data.jobId,
      userId: job.data.userId,
    });

    jobLogger.info("Job match completed", {
      queueJobId: job.id,
      jobId: matched.id,
      status: matched.status,
      score: matched.matchScore,
    });
  });
}
