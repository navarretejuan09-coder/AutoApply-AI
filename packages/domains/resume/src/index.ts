import { config } from "@autoapply/config";
import type { ResumeDto } from "@autoapply/contracts";
import { createDomainEvent, EventTypes } from "@autoapply/events";
import { createLogger } from "@autoapply/logger";

import { extractTextFromResume } from "./parser/extract-text.js";
import { extractSkills } from "./parser/extract-skills.js";
import { summarizeText } from "./parser/summarize.js";
import { PrismaResumeRepository } from "./repository/prisma-resume.repository.js";
import {
  SUPPORTED_RESUME_MIME_TYPES,
  type ResumeRepository,
  toResumeDto,
} from "./repository/resume.repository.js";

const logger = createLogger("resume.domain");

let repository: ResumeRepository = new PrismaResumeRepository();

/** Override repository (testing). */
export function setResumeRepository(repo: ResumeRepository): void {
  repository = repo;
}

export interface UploadResumeInput {
  userId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface ParsedResume {
  resumeId: string;
  skills: string[];
  summary: string;
}

function validateUploadInput(input: UploadResumeInput): void {
  if (!(SUPPORTED_RESUME_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new Error(
      `Unsupported file type. Allowed: PDF and DOCX (${SUPPORTED_RESUME_MIME_TYPES.join(", ")})`,
    );
  }

  if (input.content.length === 0) {
    throw new Error("Resume file is empty");
  }

  if (input.content.length > config.resume.maxBytes) {
    throw new Error(`Resume file exceeds maximum size of ${config.resume.maxBytes} bytes`);
  }
}

export async function uploadResume(input: UploadResumeInput): Promise<ResumeDto> {
  validateUploadInput(input);

  const record = await repository.create({
    userId: input.userId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    content: input.content,
  });

  const event = createDomainEvent({
    type: EventTypes.ResumeUploaded,
    payload: {
      resumeId: record.id,
      userId: record.userId,
      fileName: record.fileName,
    },
    metadata: {
      correlationId: record.id,
      causationId: record.id,
      actorId: record.userId,
    },
  });

  logger.info("Resume uploaded", {
    eventId: event.id,
    eventType: event.type,
    resumeId: record.id,
    userId: record.userId,
    fileName: record.fileName,
  });

  return toResumeDto(record);
}

export async function parseResume(resumeId: string): Promise<ParsedResume> {
  const record = await repository.findById(resumeId);

  if (!record) {
    throw new Error(`Resume not found: ${resumeId}`);
  }

  await repository.updateStatus(resumeId, "processing");

  try {
    const extractedText = await extractTextFromResume(record.content, record.mimeType);

    if (!extractedText) {
      throw new Error("No text could be extracted from the resume");
    }

    const skills = extractSkills(extractedText);
    const summary = summarizeText(extractedText);

    const updated = await repository.updateParseResult(resumeId, {
      status: "parsed",
      extractedText,
      skills,
      summary,
      errorMessage: null,
    });

    const event = createDomainEvent({
      type: EventTypes.ResumeParsed,
      payload: {
        resumeId: updated.id,
        userId: updated.userId,
        skills: updated.skills,
        summary: updated.summary,
      },
      metadata: {
        correlationId: updated.id,
        causationId: updated.id,
        actorId: updated.userId,
      },
    });

    logger.info("Resume parsed", {
      eventId: event.id,
      eventType: event.type,
      resumeId: updated.id,
      userId: updated.userId,
      skillCount: updated.skills.length,
    });

    return {
      resumeId: updated.id,
      skills: updated.skills,
      summary: updated.summary ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";

    await repository.updateParseResult(resumeId, {
      status: "failed",
      errorMessage: message,
    });

    logger.error("Resume parse failed", {
      resumeId,
      error: message,
    });

    throw error;
  }
}

export async function listResumesByUser(userId: string): Promise<ResumeDto[]> {
  const records = await repository.listByUserId(userId);
  return records.map(toResumeDto);
}

export async function getResumeForUser(
  resumeId: string,
  userId: string,
): Promise<ResumeDto | null> {
  const record = await repository.findByIdForUser(resumeId, userId);
  return record ? toResumeDto(record) : null;
}

export {
  SUPPORTED_RESUME_MIME_TYPES,
  type SupportedResumeMimeType,
} from "./repository/resume.repository.js";
