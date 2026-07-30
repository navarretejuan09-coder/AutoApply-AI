import type { ResumeStatus } from "@autoapply/contracts";

import type {
  CreateResumeInput,
  ParseWrite,
  ResumeBlob,
  ResumeMetadata,
  ResumeRepository,
} from "../repository/resume.repository.js";

export class InMemoryResumeRepository implements ResumeRepository {
  private records = new Map<
    string,
    ResumeMetadata & {
      content: Buffer;
    }
  >();

  private toMetadata(
    record: ResumeMetadata & {
      content: Buffer;
    },
  ): ResumeMetadata {
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

  async create(input: CreateResumeInput): Promise<ResumeMetadata> {
    const now = new Date();
    const record = {
      id: `resume-${this.records.size + 1}`,
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      content: input.content,
      status: "pending" as const,
      extractedText: null,
      skills: [] as string[],
      summary: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    return this.toMetadata(record);
  }

  async findBlobByIdForUser(id: string, userId: string): Promise<ResumeBlob | null> {
    const record = this.records.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }

    return {
      id: record.id,
      userId: record.userId,
      mimeType: record.mimeType,
      content: record.content,
    };
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeMetadata | null> {
    const record = this.records.get(id);
    return record?.userId === userId ? this.toMetadata(record) : null;
  }

  async findLatestParsedForUser(userId: string): Promise<ResumeMetadata | null> {
    const parsed = [...this.records.values()]
      .filter((record) => record.userId === userId && record.status === "parsed")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const latest = parsed[0];
    return latest ? this.toMetadata(latest) : null;
  }

  async listByUserId(userId: string): Promise<ResumeMetadata[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((record) => this.toMetadata(record));
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<void> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    this.records.set(id, { ...record, status, updatedAt: new Date() });
  }

  async updateParseResult(id: string, input: ParseWrite): Promise<ResumeMetadata> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    const updated =
      input.status === "parsed"
        ? {
            ...record,
            status: "parsed" as const,
            extractedText: input.extractedText,
            skills: input.skills,
            summary: input.summary,
            errorMessage: null,
            updatedAt: new Date(),
          }
        : {
            ...record,
            status: "failed" as const,
            errorMessage: input.errorMessage,
            updatedAt: new Date(),
          };

    this.records.set(id, updated);
    return this.toMetadata(updated);
  }
}
