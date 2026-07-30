import type { JobStatus } from "@autoapply/contracts";

import type {
  CreateJobInput,
  JobRecord,
  JobRepository,
  MatchWrite,
} from "../repository/job.repository.js";

export class InMemoryJobRepository implements JobRepository {
  private records = new Map<string, JobRecord>();

  async create(input: CreateJobInput): Promise<JobRecord> {
    const now = new Date();
    const record: JobRecord = {
      id: `job-${this.records.size + 1}`,
      userId: input.userId,
      title: input.title,
      company: input.company,
      url: input.url ?? null,
      location: input.location ?? null,
      description: input.description,
      status: "pending",
      matchScore: null,
      matchRationale: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(record.id, record);
    return { ...record };
  }

  async findByIdForUser(id: string, userId: string): Promise<JobRecord | null> {
    const record = this.records.get(id);
    return record?.userId === userId ? { ...record } : null;
  }

  async listByUserId(userId: string): Promise<JobRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((record) => ({ ...record }));
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Job not found: ${id}`);
    }
    this.records.set(id, { ...record, status, updatedAt: new Date() });
  }

  async updateMatchResult(id: string, input: MatchWrite): Promise<JobRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Job not found: ${id}`);
    }

    const updated: JobRecord =
      input.status === "matched"
        ? {
            ...record,
            status: "matched",
            matchScore: input.matchScore,
            matchRationale: input.matchRationale,
            errorMessage: null,
            updatedAt: new Date(),
          }
        : {
            ...record,
            status: "failed",
            errorMessage: input.errorMessage,
            updatedAt: new Date(),
          };

    this.records.set(id, updated);
    return { ...updated };
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const record = this.records.get(id);
    if (!record || record.userId !== userId) {
      return false;
    }
    this.records.delete(id);
    return true;
  }
}
