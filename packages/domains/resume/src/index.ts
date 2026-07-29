import { createLogger } from "@autoapply/logger";

const logger = createLogger("resume.domain");

export interface UploadResumeInput {
  userId: string;
  fileName: string;
  content: Buffer;
}

export interface ParsedResume {
  resumeId: string;
  skills: string[];
  summary: string;
}

export async function uploadResume(input: UploadResumeInput): Promise<{ resumeId: string }> {
  logger.warn("uploadResume not implemented", {
    userId: input.userId,
    fileName: input.fileName,
  });
  throw new Error("Not implemented: uploadResume");
}

export async function parseResume(resumeId: string): Promise<ParsedResume> {
  logger.warn("parseResume not implemented", { resumeId });
  throw new Error("Not implemented: parseResume");
}
