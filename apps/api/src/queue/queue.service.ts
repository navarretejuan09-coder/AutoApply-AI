import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "@autoapply/shared";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  type HealthPingJobData,
} from "./queue.constants.js";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = createLogger("api.queue");
  private readonly connection: Redis;
  private readonly healthQueue: Queue<HealthPingJobData>;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error("REDIS_URL is required");
    }

    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.healthQueue = new Queue<HealthPingJobData>(HEALTH_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  async enqueueHealthPing(source: string) {
    const job = await this.healthQueue.add(HEALTH_PING_JOB_NAME, {
      source,
      timestamp: new Date().toISOString(),
    });

    this.logger.info("Enqueued health ping job", {
      jobId: job.id,
      source,
    });

    return job;
  }

  async onModuleDestroy(): Promise<void> {
    await this.healthQueue.close();
    await this.connection.quit();
  }
}
