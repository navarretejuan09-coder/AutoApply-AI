import { Module } from "@nestjs/common";

import { ApplicationsModule } from "./applications/applications.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BrowserSessionsModule } from "./browser-sessions/browser-sessions.module.js";
import { CommonModule } from "./common/common.module.js";
import { HealthModule } from "./health/health.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { ResumesModule } from "./resumes/resumes.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    CommonModule,
    HealthModule,
    AuthModule,
    QueueModule,
    UsersModule,
    ResumesModule,
    JobsModule,
    ApplicationsModule,
    BrowserSessionsModule,
  ],
})
export class AppModule {}
