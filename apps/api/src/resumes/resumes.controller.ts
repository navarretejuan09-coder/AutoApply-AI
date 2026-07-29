import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { SessionPayload } from "@autoapply/contracts";
import { config } from "@autoapply/config";
import { memoryStorage } from "multer";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ResumesService } from "./resumes.service.js";

@Controller("resumes")
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(@Inject(ResumesService) private readonly resumesService: ResumesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: config.resume.maxBytes },
    }),
  )
  async uploadResume(
    @CurrentUser() user: SessionPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException("Resume file is required");
    }

    try {
      return await this.resumesService.uploadAndEnqueue(
        user.sub,
        file.originalname,
        file.mimetype,
        file.buffer,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      throw new BadRequestException(message);
    }
  }

  @Get()
  async listResumes(@CurrentUser() user: SessionPayload) {
    const resumes = await this.resumesService.listForUser(user.sub);
    return { resumes };
  }

  @Get(":id")
  async getResume(@CurrentUser() user: SessionPayload, @Param("id") resumeId: string) {
    const resume = await this.resumesService.getForUser(resumeId, user.sub);

    if (!resume) {
      throw new NotFoundException("Resume not found");
    }

    return resume;
  }
}
