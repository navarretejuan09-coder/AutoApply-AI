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

/** Metadata returned to API/DTO paths — never includes file bytes. */
export interface ResumeMetadata {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  status: ResumeStatus;
  extractedText: string | null;
  skills: string[];
  summary: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Blob loaded only for parsing. */
export interface ResumeBlob {
  id: string;
  userId: string;
  mimeType: string;
  content: Buffer;
}

export type ParseWrite =
  | {
      status: "parsed";
      extractedText: string;
      skills: string[];
      summary: string;
    }
  | {
      status: "failed";
      errorMessage: string;
    };

export interface ResumeRepository {
  create(input: CreateResumeInput): Promise<ResumeMetadata>;
  findBlobByIdForUser(id: string, userId: string): Promise<ResumeBlob | null>;
  findByIdForUser(id: string, userId: string): Promise<ResumeMetadata | null>;
  listByUserId(userId: string): Promise<ResumeMetadata[]>;
  updateStatus(id: string, status: ResumeStatus): Promise<void>;
  updateParseResult(id: string, input: ParseWrite): Promise<ResumeMetadata>;
}

export function toResumeDto(record: ResumeMetadata): ResumeDto {
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
