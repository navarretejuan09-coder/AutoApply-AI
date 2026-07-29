import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AuthUserDto, SessionPayload } from "@autoapply/types";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { QueueService } from "../queue/queue.service.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly queueService: QueueService,
  ) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: SessionPayload): Promise<AuthUserDto> {
    return this.usersService.findById(user.sub);
  }

  @Post("queue/ping")
  @UseGuards(JwtAuthGuard)
  async enqueuePing(@CurrentUser() user: SessionPayload) {
    const job = await this.queueService.enqueueHealthPing(user.sub);
    return {
      jobId: job.id,
      queue: job.queueName,
      name: job.name,
    };
  }
}
