import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { JobsController } from "./jobs.controller.js";
import { JobsService } from "./jobs.service.js";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
