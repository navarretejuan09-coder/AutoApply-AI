import { prisma } from "@autoapply/database";

import type {
  CreateResumeInput,
  ResumeRecord,
  ResumeRepository,
  UpdateResumeParseResultInput,
} from "./resume.repository.js";
import type { ResumeStatus } from "@autoapply/contracts";

function mapResume(record: {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  content: Uint8Array;
  status: ResumeStatus;
  extractedText: string | null;
  skills: string[];
  summary: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ResumeRecord {
  return {
    id: record.id,
    userId: record.userId,
    fileName: record.fileName,
    mimeType: record.mimeType,
    content: Buffer.from(record.content),
    status: record.status,
    extractedText: record.extractedText,
    skills: record.skills,
    summary: record.summary,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaResumeRepository implements ResumeRepository {
  async create(input: CreateResumeInput): Promise<ResumeRecord> {
    const resume = await prisma.resume.create({
      data: {
        userId: input.userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        content: new Uint8Array(input.content),
      },
    });

    return mapResume(resume);
  }

  async findById(id: string): Promise<ResumeRecord | null> {
    const resume = await prisma.resume.findUnique({ where: { id } });
    return resume ? mapResume(resume) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeRecord | null> {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
    });

    return resume ? mapResume(resume) : null;
  }

  async listByUserId(userId: string): Promise<ResumeRecord[]> {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return resumes.map(mapResume);
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<ResumeRecord> {
    const resume = await prisma.resume.update({
      where: { id },
      data: { status },
    });

    return mapResume(resume);
  }

  async updateParseResult(id: string, input: UpdateResumeParseResultInput): Promise<ResumeRecord> {
    const resume = await prisma.resume.update({
      where: { id },
      data: {
        status: input.status,
        extractedText: input.extractedText,
        skills: input.skills,
        summary: input.summary,
        errorMessage: input.errorMessage,
      },
    });

    return mapResume(resume);
  }
}
