import type { ApplicationStatus } from "@autoapply/contracts";

import type {
  ApplicationRecord,
  ApplicationRepository,
  CreateApplicationInput,
} from "../repository/application.repository.js";

export class InMemoryApplicationRepository implements ApplicationRepository {
  private records = new Map<string, ApplicationRecord>();

  async create(input: CreateApplicationInput): Promise<ApplicationRecord> {
    const existing = await this.findByUserJobProvider(input.userId, input.jobId, input.provider);
    if (existing) {
      throw new Error("Application already exists for this job and provider");
    }
    const now = new Date();
    const record: ApplicationRecord = {
      id: `app-${this.records.size + 1}`,
      userId: input.userId,
      jobId: input.jobId,
      provider: input.provider,
      status: "queued",
      externalApplicationId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async findByIdForUser(id: string, userId: string): Promise<ApplicationRecord | null> {
    const record = this.records.get(id);
    return record?.userId === userId ? { ...record } : null;
  }

  async findByUserJobProvider(
    userId: string,
    jobId: string,
    provider: string,
  ): Promise<ApplicationRecord | null> {
    for (const record of this.records.values()) {
      if (record.userId === userId && record.jobId === jobId && record.provider === provider) {
        return { ...record };
      }
    }
    return null;
  }

  async listByUserId(userId: string): Promise<ApplicationRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((record) => ({ ...record }));
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Application not found: ${id}`);
    }
    this.records.set(id, { ...record, status, updatedAt: new Date() });
  }

  async markSubmitted(
    id: string,
    externalApplicationId: string | null,
  ): Promise<ApplicationRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Application not found: ${id}`);
    }
    const updated: ApplicationRecord = {
      ...record,
      status: "submitted",
      externalApplicationId,
      errorMessage: null,
      updatedAt: new Date(),
    };
    this.records.set(id, updated);
    return { ...updated };
  }

  async markFailed(id: string, errorMessage: string): Promise<ApplicationRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Application not found: ${id}`);
    }
    const updated: ApplicationRecord = {
      ...record,
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    };
    this.records.set(id, updated);
    return { ...updated };
  }
}
