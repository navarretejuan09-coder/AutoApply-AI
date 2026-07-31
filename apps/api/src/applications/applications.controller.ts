import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { CreateApplicationRequest, SessionPayload } from "@autoapply/contracts";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationsService } from "./applications.service.js";

@Controller("applications")
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applicationsService: ApplicationsService) {}

  @Post()
  async createApplication(
    @CurrentUser() user: SessionPayload,
    @Body() body: CreateApplicationRequest,
  ) {
    try {
      return await this.applicationsService.createAndEnqueue(user.sub, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create application";
      throw new BadRequestException(message);
    }
  }

  @Get()
  async listApplications(@CurrentUser() user: SessionPayload) {
    const applications = await this.applicationsService.listForUser(user.sub);
    return { applications };
  }

  @Get(":id")
  async getApplication(@CurrentUser() user: SessionPayload, @Param("id") applicationId: string) {
    const application = await this.applicationsService.getForUser(applicationId, user.sub);
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    return { application };
  }
}
