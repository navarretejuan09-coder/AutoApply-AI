import { Inject, Injectable } from "@nestjs/common";
import {
  listApplicationsByUser,
  queueApplication,
  getApplicationForUser,
} from "@autoapply/applications";
import type { CreateApplicationRequest } from "@autoapply/contracts";

import { QueueService } from "../queue/queue.service.js";

@Injectable()
export class ApplicationsService {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  async createAndEnqueue(userId: string, input: CreateApplicationRequest) {
    const { applicationId, application } = await queueApplication({
      userId,
      jobId: input.jobId,
      provider: input.provider,
    });

    const queueJob = await this.queueService.enqueueApplicationExecute({
      applicationId,
      userId,
      jobId: input.jobId,
      provider: application.provider,
    });

    if (queueJob.id == null) {
      throw new Error("Failed to enqueue application execute");
    }

    return {
      application,
      queueJobId: String(queueJob.id),
    };
  }

  listForUser(userId: string) {
    return listApplicationsByUser(userId);
  }

  getForUser(applicationId: string, userId: string) {
    return getApplicationForUser(applicationId, userId);
  }
}
