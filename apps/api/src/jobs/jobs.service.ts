import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  archiveJob,
  createJob,
  getJobForUser,
  listJobsByUser,
  markJobFailed,
  matchJob,
  type JobsDomain,
} from "@autoapply/jobs";

import { QueueService } from "../queue/queue.service.js";

export const JOBS_DOMAIN = Symbol("JOBS_DOMAIN");

const defaultJobsDomain: JobsDomain = {
  createJob,
  matchJob,
  listJobsByUser,
  getJobForUser,
  archiveJob,
  markJobFailed,
};

@Injectable()
export class JobsService {
  private readonly jobs: JobsDomain;

  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
    @Optional() @Inject(JOBS_DOMAIN) jobsDomain?: JobsDomain,
  ) {
    this.jobs = jobsDomain ?? defaultJobsDomain;
  }

  async createAndEnqueue(
    userId: string,
    input: {
      title: string;
      company: string;
      description: string;
      url?: string;
      location?: string;
    },
  ) {
    const job = await this.jobs.createJob({ userId, ...input });

    try {
      const queueJob = await this.queueService.enqueueJobMatch(job.id, userId);

      if (queueJob.id == null) {
        throw new Error("Failed to enqueue job match");
      }

      return {
        job,
        queueJobId: String(queueJob.id),
        queue: queueJob.queueName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enqueue job match";
      await this.jobs.markJobFailed(job.id, message);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  listForUser(userId: string) {
    return this.jobs.listJobsByUser(userId);
  }

  getForUser(jobId: string, userId: string) {
    return this.jobs.getJobForUser(jobId, userId);
  }

  archiveForUser(jobId: string, userId: string) {
    return this.jobs.archiveJob(jobId, userId);
  }
}
