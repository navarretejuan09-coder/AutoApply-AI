import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
