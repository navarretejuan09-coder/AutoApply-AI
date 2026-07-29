import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  type HealthPingJobData,
} from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { RequestContextService } from "../common/request-context.service.js";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = createLogger("api.queue", { service: "api" });
  private readonly connection: Redis;
  private readonly healthQueue: Queue<HealthPingJobData>;

  constructor(private readonly requestContext: RequestContextService) {
    this.connection = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
    });

    this.healthQueue = new Queue<HealthPingJobData>(HEALTH_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  async enqueueHealthPing(source: string) {
    const correlationId =
      this.requestContext.getCorrelationId() ?? crypto.randomUUID();

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

  async onModuleDestroy(): Promise<void> {
    await this.healthQueue.close();
    await this.connection.quit();
  }
}
