import { Inject, Injectable } from "@nestjs/common";
import {
  getResumeForUser,
  listResumesByUser,
  uploadResume,
} from "@autoapply/resume";

import { QueueService } from "../queue/queue.service.js";

@Injectable()
export class ResumesService {
  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {}

  async uploadAndEnqueue(
    userId: string,
    fileName: string,
    mimeType: string,
    content: Buffer,
  ) {
    const resume = await uploadResume({ userId, fileName, mimeType, content });
    const job = await this.queueService.enqueueResumeParse(resume.id, userId);

    return {
      resume,
      jobId: job.id,
      queue: job.queueName,
    };
  }

  listForUser(userId: string) {
    return listResumesByUser(userId);
  }

  getForUser(resumeId: string, userId: string) {
    return getResumeForUser(resumeId, userId);
  }
}
