import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import "../src/load-env.js";

import {
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  RESUME_PARSE_JOB_NAME,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import type { Job } from "bullmq";

import {
  createHealthPingHandler,
  createJobMatchHandler,
  createResumeParseHandler,
} from "../src/handlers.js";

function makeJob<T>(name: string, data: T, id = "job-1"): Job<T> {
  return { id, name, data } as Job<T>;
}

describe("worker handlers", () => {
  it("createHealthPingHandler processes valid health ping", async () => {
    const data: HealthPingJobData = {
      source: "test",
      timestamp: new Date().toISOString(),
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createHealthPingHandler()(makeJob(HEALTH_PING_JOB_NAME, data));
  });

  it("createHealthPingHandler ignores unknown job names", async () => {
    const data: HealthPingJobData = {
      source: "test",
      timestamp: new Date().toISOString(),
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createHealthPingHandler()(makeJob("other-job", data));
  });

  it("createResumeParseHandler calls parseResume for valid jobs", async () => {
    const parseMock = mock.fn(async () => ({
      resumeId: "resume-1",
      skills: ["TypeScript"],
      summary: "Engineer",
    }));

    const data: ResumeParseJobData = {
      resumeId: "resume-1",
      userId: "user-1",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createResumeParseHandler(parseMock)(makeJob(RESUME_PARSE_JOB_NAME, data));

    assert.equal(parseMock.mock.callCount(), 1);
    assert.deepEqual(parseMock.mock.calls[0]?.arguments[0], {
      resumeId: "resume-1",
      userId: "user-1",
    });
  });

  it("createResumeParseHandler ignores unknown job names", async () => {
    const data: ResumeParseJobData = {
      resumeId: "resume-1",
      userId: "user-1",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createResumeParseHandler()(makeJob("wrong", data));
  });

  it("createJobMatchHandler calls matchJob for valid jobs", async () => {
    const matchMock = mock.fn(async () => ({
      id: "job-1",
      status: "matched",
      matchScore: 88,
    }));

    const data: JobMatchJobData = {
      jobId: "job-1",
      userId: "user-1",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createJobMatchHandler(matchMock)(makeJob(JOB_MATCH_JOB_NAME, data));

    assert.equal(matchMock.mock.callCount(), 1);
    assert.deepEqual(matchMock.mock.calls[0]?.arguments[0], {
      jobId: "job-1",
      userId: "user-1",
    });
  });

  it("createJobMatchHandler ignores unknown job names", async () => {
    const data: JobMatchJobData = {
      jobId: "job-1",
      userId: "user-1",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createJobMatchHandler()(makeJob("wrong", data));
  });
});
