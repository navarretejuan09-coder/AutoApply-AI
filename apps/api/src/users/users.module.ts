import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [AuthModule, QueueModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
