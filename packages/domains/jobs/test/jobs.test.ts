import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createJobMatchAgent } from "@autoapply/agents";

import { createJobsDomain } from "../src/index.js";
import { InMemoryJobRepository } from "../src/testing/in-memory-job.repository.js";

function createTestJobsDomain(options?: {
  resumeLookup?: Parameters<typeof createJobsDomain>[0]["resumeLookup"];
  agentDeps?: Parameters<typeof createJobMatchAgent>[0];
}) {
  return createJobsDomain({
    repository: new InMemoryJobRepository(),
    resumeLookup: options?.resumeLookup ?? (async () => null),
    runJobMatch: createJobMatchAgent(
      options?.agentDeps ?? {
        embed: async () => [1, 0],
        cosineSimilarity: () => 0.5,
        chat: async () => "ok",
      },
    ),
  });
}

describe("jobs domain", () => {
  it("createJob validates required fields and returns pending DTO", async () => {
    const jobs = createTestJobsDomain();

    await assert.rejects(
      () => jobs.createJob({ userId: "u1", title: " ", company: "Acme", description: "Role" }),
      /title is required/,
    );

    const job = await jobs.createJob({
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
    const jobs = createTestJobsDomain({ resumeLookup: async () => null });

    const job = await jobs.createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "TypeScript role",
    });

    const matched = await jobs.matchJob({ jobId: job.id, userId: "u1" });
    assert.equal(matched.status, "failed");
    assert.match(matched.errorMessage ?? "", /parse a resume/i);
  });

  it("matchJob stores score and rationale from the agent", async () => {
    const jobs = createTestJobsDomain({
      resumeLookup: async () => ({
        resumeId: "resume-1",
        skills: ["TypeScript", "NestJS"],
        summary: "Backend engineer",
        extractedText: "Built NestJS APIs in TypeScript",
      }),
      agentDeps: {
        embed: async () => [1, 0],
        cosineSimilarity: () => 0.91,
        chat: async () => "Strong TypeScript overlap.",
      },
    });

    const job = await jobs.createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "TypeScript NestJS",
    });

    const matched = await jobs.matchJob({ jobId: job.id, userId: "u1" });
    assert.equal(matched.status, "matched");
    assert.equal(matched.matchScore, 91);
    assert.equal(matched.matchRationale, "Strong TypeScript overlap.");

    const listed = await jobs.listJobsByUser("u1");
    assert.equal(listed.length, 1);
    assert.equal(await jobs.getJobForUser(job.id, "u2"), null);

    assert.equal(await jobs.archiveJob(job.id, "u1"), true);
    assert.equal((await jobs.listJobsByUser("u1")).length, 0);
  });

  it("createJob validates company and description", async () => {
    const jobs = createTestJobsDomain();

    await assert.rejects(
      () => jobs.createJob({ userId: "u1", title: "Role", company: " ", description: "Desc" }),
      /company is required/,
    );
    await assert.rejects(
      () => jobs.createJob({ userId: "u1", title: "Role", company: "Acme", description: " " }),
      /description is required/,
    );
  });

  it("matchJob throws when job not found", async () => {
    const jobs = createTestJobsDomain();

    await assert.rejects(() => jobs.matchJob({ jobId: "missing", userId: "u1" }), /Job not found/);
  });

  it("matchJob handles agent errors gracefully", async () => {
    const jobs = createTestJobsDomain({
      resumeLookup: async () => ({
        resumeId: "resume-1",
        skills: ["TypeScript"],
        summary: "Engineer",
        extractedText: "Built APIs",
      }),
      agentDeps: {
        embed: async () => {
          throw new Error("LLM unavailable");
        },
        cosineSimilarity: () => 0.5,
        chat: async () => "ignored",
      },
    });

    const job = await jobs.createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "APIs",
    });

    const matched = await jobs.matchJob({ jobId: job.id, userId: "u1" });
    assert.equal(matched.status, "failed");
    assert.match(matched.errorMessage ?? "", /LLM unavailable/);
  });

  it("archiveJob returns false for foreign user", async () => {
    const jobs = createTestJobsDomain();

    const job = await jobs.createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "Role",
    });

    assert.equal(await jobs.archiveJob(job.id, "u2"), false);
  });

  it("markJobFailed updates status", async () => {
    const jobs = createTestJobsDomain();

    const job = await jobs.createJob({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "Role",
    });

    const failed = await jobs.markJobFailed(job.id, "enqueue failed");
    assert.equal(failed.status, "failed");
    assert.equal(failed.errorMessage, "enqueue failed");
  });
});

describe("job repository helpers", () => {
  it("toJobDto serializes dates", async () => {
    const { toJobDto } = await import("../src/repository/job.repository.js");
    const now = new Date("2026-01-01T00:00:00.000Z");
    const dto = toJobDto({
      id: "j1",
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      url: null,
      location: "Remote",
      description: "Build",
      status: "pending",
      matchScore: null,
      matchRationale: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(dto.createdAt, now.toISOString());
    assert.equal(dto.location, "Remote");
  });
});

describe("PrismaJobRepository", () => {
  it("maps prisma records through all repository methods", async () => {
    const { PrismaJobRepository } = await import("../src/repository/prisma-job.repository.js");
    const now = new Date("2026-01-01T00:00:00.000Z");
    const baseRecord = {
      id: "job-1",
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      url: null,
      location: "Remote",
      description: "Build",
      status: "pending" as const,
      matchScore: null,
      matchRationale: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    const db = {
      job: {
        create: async () => baseRecord,
        findFirst: async () => baseRecord,
        findMany: async () => [baseRecord],
        update: async (args: { data: { status?: string; errorMessage?: string } }) => ({
          ...baseRecord,
          status: (args.data.status ?? baseRecord.status) as typeof baseRecord.status,
          matchScore: args.data.status === "matched" ? 90 : null,
          matchRationale: args.data.status === "matched" ? "Good" : null,
          errorMessage: args.data.errorMessage ?? null,
        }),
        deleteMany: async () => ({ count: 1 }),
      },
    };

    const repo = new PrismaJobRepository(db as never);

    const created = await repo.create({
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      description: "Build",
    });
    assert.equal(created.id, "job-1");

    assert.ok(await repo.findByIdForUser("job-1", "u1"));
    assert.equal((await repo.listByUserId("u1")).length, 1);
    await repo.updateStatus("job-1", "matching");

    const matched = await repo.updateMatchResult("job-1", {
      status: "matched",
      matchScore: 90,
      matchRationale: "Good",
    });
    assert.equal(matched.matchScore, 90);

    const failed = await repo.updateMatchResult("job-1", {
      status: "failed",
      errorMessage: "nope",
    });
    assert.equal(failed.status, "failed");

    assert.equal(await repo.deleteForUser("job-1", "u1"), true);
  });
});
