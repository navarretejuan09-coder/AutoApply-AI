import { Global, Module } from "@nestjs/common";
import {
  HEALTH_QUEUE_NAME,
  JOB_QUEUE_NAME,
  RESUME_QUEUE_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { createQueueDeps, QUEUE_SERVICE_DEPS, QueueService } from "./queue.service.js";

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_SERVICE_DEPS,
      useFactory: () => {
        const connection = new Redis(config.redis.url, {
          maxRetriesPerRequest: null,
        });

        return createQueueDeps({
          createConnection: () => connection,
          createHealthQueue: () => new Queue<HealthPingJobData>(HEALTH_QUEUE_NAME, { connection }),
          createResumeQueue: () => new Queue<ResumeParseJobData>(RESUME_QUEUE_NAME, { connection }),
          createJobsQueue: () => new Queue<JobMatchJobData>(JOB_QUEUE_NAME, { connection }),
        });
      },
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
