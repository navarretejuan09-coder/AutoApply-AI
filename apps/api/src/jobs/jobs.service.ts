import { Inject, Injectable } from "@nestjs/common";
import { archiveJob, createJob, getJobForUser, listJobsByUser } from "@autoapply/jobs";

import { QueueService } from "../queue/queue.service.js";

@Injectable()
export class JobsService {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

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
    const job = await createJob({ userId, ...input });
    const queueJob = await this.queueService.enqueueJobMatch(job.id, userId);

    if (queueJob.id == null) {
      throw new Error("Failed to enqueue job match");
    }

    return {
      job,
      queueJobId: String(queueJob.id),
      queue: queueJob.queueName,
    };
  }

  listForUser(userId: string) {
    return listJobsByUser(userId);
  }

  getForUser(jobId: string, userId: string) {
    return getJobForUser(jobId, userId);
  }

  archiveForUser(jobId: string, userId: string) {
    return archiveJob(jobId, userId);
  }
}
