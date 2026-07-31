import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { JobDto } from "@autoapply/contracts";

import {
  queueApplication,
  resetApplicationJobLookup,
  resetApplicationRepository,
  setApplicationJobLookup,
  setApplicationRepository,
  listApplicationsByUser,
  getApplicationForUser,
  markApplicationSubmitting,
  markApplicationSubmitted,
  markApplicationFailed,
  getApplicationExecutionContext,
} from "../src/index.js";
import { InMemoryApplicationRepository } from "../src/testing/in-memory-application.repository.js";

const sampleJob: JobDto = {
  id: "job-1",
  userId: "user-1",
  title: "Engineer",
  company: "Acme",
  url: "https://www.linkedin.com/jobs/view/123",
  location: null,
  description: "Build things",
  status: "matched",
  matchScore: 0.9,
  matchRationale: "Good fit",
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

afterEach(() => {
  resetApplicationRepository();
  resetApplicationJobLookup();
});

describe("queueApplication", () => {
  it("creates a queued application when job has a URL", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => sampleJob);

    const result = await queueApplication({ userId: "user-1", jobId: "job-1" });
    assert.equal(result.application.status, "queued");
    assert.equal(result.application.provider, "linkedin");
  });

  it("rejects when job has no URL", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => ({ ...sampleJob, url: null }));

    await assert.rejects(
      () => queueApplication({ userId: "user-1", jobId: "job-1" }),
      /Job URL is required/,
    );
  });

  it("rejects duplicate applications", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => sampleJob);

    await queueApplication({ userId: "user-1", jobId: "job-1" });
    await assert.rejects(
      () => queueApplication({ userId: "user-1", jobId: "job-1" }),
      /already exists/,
    );
  });

  it("rejects when job not found", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => null);

    await assert.rejects(
      () => queueApplication({ userId: "user-1", jobId: "job-1" }),
      /Job not found/,
    );
  });
});

describe("application lifecycle", () => {
  it("lists, gets, and updates status", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => sampleJob);

    const { applicationId } = await queueApplication({ userId: "user-1", jobId: "job-1" });

    const listed = await listApplicationsByUser("user-1");
    assert.equal(listed.length, 1);

    const fetched = await getApplicationForUser(applicationId, "user-1");
    assert.ok(fetched);

    await markApplicationSubmitting(applicationId);
    const submitted = await markApplicationSubmitted(applicationId, "ext-1");
    assert.equal(submitted.status, "submitted");

    const ctx = await getApplicationExecutionContext(applicationId, "user-1");
    assert.ok(ctx?.jobUrl.includes("linkedin"));
  });

  it("marks failed status", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => sampleJob);
    const { applicationId } = await queueApplication({ userId: "user-1", jobId: "job-1" });
    const failed = await markApplicationFailed(applicationId, "nope");
    assert.equal(failed.status, "failed");
  });
});
