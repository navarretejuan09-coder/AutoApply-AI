import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  RESUME_PARSE_JOB_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

import { RequestContextService } from "../common/request-context.service.js";

export const QUEUE_SERVICE_DEPS = Symbol("QUEUE_SERVICE_DEPS");

export interface QueueConnection {
  quit(): Promise<unknown>;
}

export interface EnqueuedJob {
  id?: string;
  name?: string;
  queueName?: string;
}

export interface EnqueueableQueue<T> {
  add(name: string, data: T): Promise<EnqueuedJob>;
  close(): Promise<void>;
}

export interface QueueServiceDeps {
  connection: QueueConnection;
  healthQueue: EnqueueableQueue<HealthPingJobData>;
  resumeQueue: EnqueueableQueue<ResumeParseJobData>;
  jobsQueue: EnqueueableQueue<JobMatchJobData>;
}

export interface QueueInfrastructure {
  createConnection: () => QueueConnection;
  createHealthQueue: (connection: QueueConnection) => EnqueueableQueue<HealthPingJobData>;
  createResumeQueue: (connection: QueueConnection) => EnqueueableQueue<ResumeParseJobData>;
  createJobsQueue: (connection: QueueConnection) => EnqueueableQueue<JobMatchJobData>;
}

export function createQueueDeps(infrastructure: QueueInfrastructure): QueueServiceDeps {
  const connection = infrastructure.createConnection();
  return {
    connection,
    healthQueue: infrastructure.createHealthQueue(connection),
    resumeQueue: infrastructure.createResumeQueue(connection),
    jobsQueue: infrastructure.createJobsQueue(connection),
  };
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = createLogger("api.queue", { service: "api" });
  private readonly connection: QueueConnection;
  private readonly healthQueue: EnqueueableQueue<HealthPingJobData>;
  private readonly resumeQueue: EnqueueableQueue<ResumeParseJobData>;
  private readonly jobsQueue: EnqueueableQueue<JobMatchJobData>;

  constructor(
    @Inject(RequestContextService) private readonly requestContext: RequestContextService,
    @Inject(QUEUE_SERVICE_DEPS) deps: QueueServiceDeps,
  ) {
    this.connection = deps.connection;
    this.healthQueue = deps.healthQueue;
    this.resumeQueue = deps.resumeQueue;
    this.jobsQueue = deps.jobsQueue;
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
