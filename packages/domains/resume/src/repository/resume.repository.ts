import type { ResumeDto, ResumeStatus } from "@autoapply/contracts";

export const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedResumeMimeType = (typeof SUPPORTED_RESUME_MIME_TYPES)[number];

export interface CreateResumeInput {
  userId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
  status: ResumeStatus;
  extractedText: string | null;
  skills: string[];
  summary: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateResumeParseResultInput {
  status: ResumeStatus;
  extractedText?: string | null;
  skills?: string[];
  summary?: string | null;
  errorMessage?: string | null;
}

export interface ResumeRepository {
  create(input: CreateResumeInput): Promise<ResumeRecord>;
  findById(id: string): Promise<ResumeRecord | null>;
  findByIdForUser(id: string, userId: string): Promise<ResumeRecord | null>;
  listByUserId(userId: string): Promise<ResumeRecord[]>;
  updateStatus(id: string, status: ResumeStatus): Promise<ResumeRecord>;
  updateParseResult(id: string, input: UpdateResumeParseResultInput): Promise<ResumeRecord>;
}

export function toResumeDto(record: ResumeRecord): ResumeDto {
  return {
    id: record.id,
    userId: record.userId,
    fileName: record.fileName,
    mimeType: record.mimeType,
    status: record.status,
    skills: record.skills,
    summary: record.summary,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
