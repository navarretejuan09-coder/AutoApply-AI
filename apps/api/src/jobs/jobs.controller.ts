import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { CreateJobRequest, SessionPayload } from "@autoapply/contracts";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { JobsService } from "./jobs.service.js";

@Controller("jobs")
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Post()
  async createJob(@CurrentUser() user: SessionPayload, @Body() body: CreateJobRequest) {
    try {
      return await this.jobsService.createAndEnqueue(user.sub, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create job";
      throw new BadRequestException(message);
    }
  }

  @Get()
  async listJobs(@CurrentUser() user: SessionPayload) {
    const jobs = await this.jobsService.listForUser(user.sub);
    return { jobs };
  }

  @Get(":id")
  async getJob(@CurrentUser() user: SessionPayload, @Param("id") jobId: string) {
    const job = await this.jobsService.getForUser(jobId, user.sub);
    if (!job) {
      throw new NotFoundException("Job not found");
    }
    return job;
  }

  @Delete(":id")
  async deleteJob(@CurrentUser() user: SessionPayload, @Param("id") jobId: string) {
    const deleted = await this.jobsService.archiveForUser(jobId, user.sub);
    if (!deleted) {
      throw new NotFoundException("Job not found");
    }
    return { ok: true };
  }
}
