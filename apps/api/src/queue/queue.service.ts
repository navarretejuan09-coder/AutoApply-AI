import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  JOB_MATCH_JOB_NAME,
  JOB_QUEUE_NAME,
  RESUME_PARSE_JOB_NAME,
  RESUME_QUEUE_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { RequestContextService } from "../common/request-context.service.js";

export interface QueueServiceDeps {
  connection: Redis;
  healthQueue: Queue<HealthPingJobData>;
  resumeQueue: Queue<ResumeParseJobData>;
  jobsQueue: Queue<JobMatchJobData>;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = createLogger("api.queue", { service: "api" });
  private readonly connection: Redis;
  private readonly healthQueue: Queue<HealthPingJobData>;
  private readonly resumeQueue: Queue<ResumeParseJobData>;
  private readonly jobsQueue: Queue<JobMatchJobData>;

  constructor(
    @Inject(RequestContextService) private readonly requestContext: RequestContextService,
    deps?: Partial<QueueServiceDeps>,
  ) {
    this.connection =
      deps?.connection ??
      new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
      });

    this.healthQueue =
      deps?.healthQueue ??
      new Queue<HealthPingJobData>(HEALTH_QUEUE_NAME, {
        connection: this.connection,
      });

    this.resumeQueue =
      deps?.resumeQueue ??
      new Queue<ResumeParseJobData>(RESUME_QUEUE_NAME, {
        connection: this.connection,
      });

    this.jobsQueue =
      deps?.jobsQueue ??
      new Queue<JobMatchJobData>(JOB_QUEUE_NAME, {
        connection: this.connection,
      });
  }

  async enqueueHealthPing(source: string) {
    const correlationId = this.requestContext.getCorrelationId() ?? crypto.randomUUID();

    const job = await this.healthQueue.add(HEALTH_PING_JOB_NAME, {
      source,
      timestamp: new Date().toISOString(),
      correlationId,
      causationId: correlationId,
    });

    this.logger.info("Enqueued health ping job", {
      jobId: job.id,
      source,
      correlationId,
      causationId: job.id,
    });

    return job;
  }

  async enqueueResumeParse(resumeId: string, userId: string) {
    const correlationId = this.requestContext.getCorrelationId() ?? crypto.randomUUID();

    const job = await this.resumeQueue.add(RESUME_PARSE_JOB_NAME, {
      resumeId,
      userId,
      correlationId,
      causationId: correlationId,
    });

    this.logger.info("Enqueued resume parse job", {
      jobId: job.id,
      resumeId,
      userId,
      correlationId,
      causationId: job.id,
    });

    return job;
  }

  async enqueueJobMatch(jobId: string, userId: string) {
    const correlationId = this.requestContext.getCorrelationId() ?? crypto.randomUUID();

    const job = await this.jobsQueue.add(JOB_MATCH_JOB_NAME, {
      jobId,
      userId,
      correlationId,
      causationId: correlationId,
    });

    this.logger.info("Enqueued job match", {
      queueJobId: job.id,
      jobId,
      userId,
      correlationId,
      causationId: job.id,
    });

    return job;
  }

  async onModuleDestroy(): Promise<void> {
    await this.healthQueue.close();
    await this.resumeQueue.close();
    await this.jobsQueue.close();
    await this.connection.quit();
  }
}
