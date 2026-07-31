import {
  APPLICATION_EXECUTE_JOB_NAME,
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  RESUME_PARSE_JOB_NAME,
  type ApplicationExecuteJobData,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import {
  getApplicationExecutionContext,
  markApplicationFailed,
  markApplicationSubmitted,
  markApplicationSubmitting,
} from "@autoapply/applications";
import { matchJob } from "@autoapply/jobs";
import { createLogger } from "@autoapply/logger";
import { parseResume } from "@autoapply/resume";
import type { Job } from "bullmq";

import { postBrowserExecute } from "./browser-client.js";

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

export function createApplicationExecuteHandler(
  deps: {
    executeOnBrowser?: typeof postBrowserExecute;
    markSubmitting?: typeof markApplicationSubmitting;
    getContext?: typeof getApplicationExecutionContext;
    markSubmitted?: typeof markApplicationSubmitted;
    markFailed?: typeof markApplicationFailed;
  } = {},
) {
  const executeOnBrowser = deps.executeOnBrowser ?? postBrowserExecute;
  const markSubmitting = deps.markSubmitting ?? markApplicationSubmitting;
  const getContext = deps.getContext ?? getApplicationExecutionContext;
  const markSubmitted = deps.markSubmitted ?? markApplicationSubmitted;
  const markFailed = deps.markFailed ?? markApplicationFailed;

  return createNamedHandler<ApplicationExecuteJobData>(
    APPLICATION_EXECUTE_JOB_NAME,
    async (job, jobLogger) => {
      const { applicationId, userId, jobId, provider } = job.data;

      jobLogger.info("Processing application execute", {
        queueJobId: job.id,
        applicationId,
        userId,
        jobId,
        provider,
      });

      await markSubmitting(applicationId);

      const context = await getContext(applicationId, userId);
      if (!context) {
        await markFailed(applicationId, "Application or job URL not found");
        return;
      }

      try {
        const { result } = await executeOnBrowser({
          userId,
          applicationId,
          pluginName: provider,
          plan: {
            jobId,
            steps: ["open_job", "easy_apply", "submit"],
            metadata: { jobUrl: context.jobUrl },
          },
        });

        if (result.success) {
          await markSubmitted(applicationId, result.applicationId ?? null);
          jobLogger.info("Application execute completed", {
            applicationId,
            externalApplicationId: result.applicationId,
          });
          return;
        }

        await markFailed(applicationId, result.error ?? "Application failed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Browser execution failed";
        await markFailed(applicationId, message);
        jobLogger.warn("Application execute error", { applicationId, message });
      }
    },
  );
}
