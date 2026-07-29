import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [HealthModule, AuthModule, QueueModule, UsersModule],
})
export class AppModule {}
