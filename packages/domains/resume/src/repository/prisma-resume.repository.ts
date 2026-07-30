import { prisma } from "@autoapply/database";
import type { ResumeStatus } from "@autoapply/contracts";

import type {
  CreateResumeInput,
  ParseWrite,
  ResumeBlob,
  ResumeMetadata,
  ResumeRepository,
} from "./resume.repository.js";

type ResumeDb = Pick<typeof prisma, "resume">;

const metadataSelect = {
  id: true,
  userId: true,
  fileName: true,
  mimeType: true,
  status: true,
  extractedText: true,
  skills: true,
  summary: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapMetadata(record: {
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
}): ResumeMetadata {
  return {
    id: record.id,
    userId: record.userId,
    fileName: record.fileName,
    mimeType: record.mimeType,
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
  constructor(private readonly db: ResumeDb = prisma) {}

  async create(input: CreateResumeInput): Promise<ResumeMetadata> {
    const resume = await this.db.resume.create({
      data: {
        userId: input.userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        content: new Uint8Array(input.content),
      },
      select: metadataSelect,
    });

    return mapMetadata(resume);
  }

  async findBlobByIdForUser(id: string, userId: string): Promise<ResumeBlob | null> {
    const resume = await this.db.resume.findFirst({
      where: { id, userId },
      select: {
        id: true,
        userId: true,
        mimeType: true,
        content: true,
      },
    });

    if (!resume) {
      return null;
    }

    return {
      id: resume.id,
      userId: resume.userId,
      mimeType: resume.mimeType,
      content: Buffer.from(resume.content),
    };
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeMetadata | null> {
    const resume = await this.db.resume.findFirst({
      where: { id, userId },
      select: metadataSelect,
    });

    return resume ? mapMetadata(resume) : null;
  }

  async findLatestParsedForUser(userId: string): Promise<ResumeMetadata | null> {
    const resume = await this.db.resume.findFirst({
      where: { userId, status: "parsed" },
      orderBy: { createdAt: "desc" },
      select: metadataSelect,
    });

    return resume ? mapMetadata(resume) : null;
  }

  async listByUserId(userId: string): Promise<ResumeMetadata[]> {
    const resumes = await this.db.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: metadataSelect,
    });

    return resumes.map(mapMetadata);
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<void> {
    await this.db.resume.update({
      where: { id },
      data: { status },
      select: { id: true },
    });
  }

  async updateParseResult(id: string, input: ParseWrite): Promise<ResumeMetadata> {
    switch (input.status) {
      case "parsed": {
        const resume = await this.db.resume.update({
          where: { id },
          data: {
            status: "parsed",
            extractedText: input.extractedText,
            skills: input.skills,
            summary: input.summary,
            errorMessage: null,
          },
          select: metadataSelect,
        });
        return mapMetadata(resume);
      }
      case "failed": {
        const resume = await this.db.resume.update({
          where: { id },
          data: {
            status: "failed",
            errorMessage: input.errorMessage,
          },
          select: metadataSelect,
        });
        return mapMetadata(resume);
      }
      default: {
        const exhaustive: never = input;
        throw new Error(`Unhandled parse write: ${JSON.stringify(exhaustive)}`);
      }
    }
  }
}
