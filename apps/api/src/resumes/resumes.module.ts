import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { ResumesController } from "./resumes.controller.js";
import { ResumesService } from "./resumes.service.js";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
