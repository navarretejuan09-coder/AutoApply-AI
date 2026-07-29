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
import { SUPPORTED_RESUME_MIME_TYPES } from "@autoapply/resume";
import { memoryStorage } from "multer";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { QueueService } from "../queue/queue.service.js";
import { ResumesService } from "./resumes.service.js";

@Controller("resumes")
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(
    @Inject(ResumesService) private readonly resumesService: ResumesService,
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {}

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

    if (!(SUPPORTED_RESUME_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException(
        "Unsupported file type. Upload a PDF or DOCX resume.",
      );
    }

    try {
      const resume = await this.resumesService.upload(
        user.sub,
        file.originalname,
        file.mimetype,
        file.buffer,
      );

      const job = await this.queueService.enqueueResumeParse(resume.id, user.sub);

      return {
        resume,
        jobId: job.id,
        queue: job.queueName,
      };
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
  async getResume(
    @CurrentUser() user: SessionPayload,
    @Param("id") resumeId: string,
  ) {
    const resume = await this.resumesService.getForUser(resumeId, user.sub);

    if (!resume) {
      throw new NotFoundException("Resume not found");
    }

    return resume;
  }
}
