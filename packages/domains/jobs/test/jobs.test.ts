import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { JobStatus } from "@autoapply/contracts";

import {
  archiveJob,
  createJob,
  getJobForUser,
  listJobsByUser,
  matchJob,
  resetJobsAgentDeps,
  resetResumeMatchLookup,
  setJobRepository,
  setJobsAgentDeps,
  setResumeMatchLookup,
} from "../src/index.js";
import type {
  CreateJobInput,
  JobRecord,
  JobRepository,
  MatchWrite,
} from "../src/repository/job.repository.js";

class InMemoryJobRepository implements JobRepository {
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

afterEach(() => {
  resetJobsAgentDeps();
  resetResumeMatchLookup();
});

describe("jobs domain", () => {
  it("createJob validates required fields and returns pending DTO", async () => {
    setJobRepository(new InMemoryJobRepository());

    await assert.rejects(
      () => createJob({ userId: "u1", title: " ", company: "Acme", description: "Role" }),
      /title is required/,
    );

    const job = await createJob({
      userId: "u1",
      title: " Engineer ",
      company: " Acme ",
      description: " Build APIs ",
      url: "https://example.com",
      location: "Remote",
    });

    assert.equal(job.title, "Engineer");
    assert.equal(job.company, "Acme");
    assert.equal(job.status, "pending");
    assert.equal(job.matchScore, null);
  });

  it("matchJob fails when no parsed resume exists", async () => {
    setJobRepository(new InMemoryJobRepository());
    setResumeMatchLookup(async () => null);

    const job = await createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "TypeScript role",
    });

    const matched = await matchJob({ jobId: job.id, userId: "u1" });
    assert.equal(matched.status, "failed");
    assert.match(matched.errorMessage ?? "", /parse a resume/i);
  });

  it("matchJob stores score and rationale from the agent", async () => {
    setJobRepository(new InMemoryJobRepository());
    setResumeMatchLookup(async () => ({
      resumeId: "resume-1",
      skills: ["TypeScript", "NestJS"],
      summary: "Backend engineer",
      extractedText: "Built NestJS APIs in TypeScript",
    }));
    setJobsAgentDeps({
      embed: async () => [1, 0],
      cosineSimilarity: () => 0.91,
      chat: async () => "Strong TypeScript overlap.",
    });

    const job = await createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "TypeScript NestJS",
    });

    const matched = await matchJob({ jobId: job.id, userId: "u1" });
    assert.equal(matched.status, "matched");
    assert.equal(matched.matchScore, 91);
    assert.equal(matched.matchRationale, "Strong TypeScript overlap.");

    const listed = await listJobsByUser("u1");
    assert.equal(listed.length, 1);
    assert.equal(await getJobForUser(job.id, "u2"), null);

    assert.equal(await archiveJob(job.id, "u1"), true);
    assert.equal((await listJobsByUser("u1")).length, 0);
  });
});
