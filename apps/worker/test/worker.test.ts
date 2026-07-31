import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import "../src/load-env.js";

import {
  APPLICATION_EXECUTE_JOB_NAME,
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  RESUME_PARSE_JOB_NAME,
  type ApplicationExecuteJobData,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import type { Job } from "bullmq";

import {
  createApplicationExecuteHandler,
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

  it("createApplicationExecuteHandler marks submitted when browser succeeds", async () => {
    const executeMock = mock.fn(async () => ({
      result: { success: true, applicationId: "li-1" },
    }));
    const submittingMock = mock.fn(async () => {});
    const submittedMock = mock.fn(async () => ({ id: "app-1", status: "submitted" }));
    const failedMock = mock.fn(async () => ({ id: "app-1", status: "failed" }));
    const contextMock = mock.fn(async () => ({
      application: { id: "app-1", jobId: "job-1", provider: "linkedin" },
      jobUrl: "https://linkedin.com/jobs/1",
      provider: "linkedin",
    }));

    const data: ApplicationExecuteJobData = {
      applicationId: "app-1",
      userId: "user-1",
      jobId: "job-1",
      provider: "linkedin",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createApplicationExecuteHandler({
      executeOnBrowser: executeMock,
      markSubmitting: submittingMock,
      getContext: contextMock,
      markSubmitted: submittedMock,
      markFailed: failedMock,
    })(makeJob(APPLICATION_EXECUTE_JOB_NAME, data));

    assert.equal(submittingMock.mock.callCount(), 1);
    assert.equal(executeMock.mock.callCount(), 1);
    assert.equal(submittedMock.mock.callCount(), 1);
    assert.equal(failedMock.mock.callCount(), 0);
  });

  it("createApplicationExecuteHandler marks failed when context missing", async () => {
    const failedMock = mock.fn(async () => ({ id: "app-1", status: "failed" }));
    const submittingMock = mock.fn(async () => {});

    const data: ApplicationExecuteJobData = {
      applicationId: "app-1",
      userId: "user-1",
      jobId: "job-1",
      provider: "linkedin",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createApplicationExecuteHandler({
      getContext: async () => null,
      markSubmitting: submittingMock,
      markFailed: failedMock,
    })(makeJob(APPLICATION_EXECUTE_JOB_NAME, data));

    assert.equal(failedMock.mock.callCount(), 1);
  });

  it("createApplicationExecuteHandler marks failed when browser returns error", async () => {
    const failedMock = mock.fn(async () => ({ id: "app-1", status: "failed" }));
    await createApplicationExecuteHandler({
      executeOnBrowser: async () => ({ result: { success: false, error: "no easy apply" } }),
      getContext: async () => ({
        application: { id: "app-1" },
        jobUrl: "https://example.com",
        provider: "linkedin",
      }),
      markSubmitting: async () => {},
      markFailed: failedMock,
    })(
      makeJob(APPLICATION_EXECUTE_JOB_NAME, {
        applicationId: "app-1",
        userId: "user-1",
        jobId: "job-1",
        provider: "linkedin",
        correlationId: "c",
        causationId: "c",
      }),
    );

    assert.equal(failedMock.mock.callCount(), 1);
  });

  it("createApplicationExecuteHandler marks failed when browser throws", async () => {
    const failedMock = mock.fn(async () => ({ id: "app-1", status: "failed" }));
    await createApplicationExecuteHandler({
      executeOnBrowser: async () => {
        throw new Error("connection refused");
      },
      getContext: async () => ({
        application: { id: "app-1" },
        jobUrl: "https://example.com",
        provider: "linkedin",
      }),
      markSubmitting: async () => {},
      markFailed: failedMock,
    })(
      makeJob(APPLICATION_EXECUTE_JOB_NAME, {
        applicationId: "app-1",
        userId: "user-1",
        jobId: "job-1",
        provider: "linkedin",
        correlationId: "c",
        causationId: "c",
      }),
    );

    assert.equal(failedMock.mock.callCount(), 1);
  });

  it("createApplicationExecuteHandler ignores unknown job names", async () => {
    const data: ApplicationExecuteJobData = {
      applicationId: "app-1",
      userId: "user-1",
      jobId: "job-1",
      provider: "linkedin",
      correlationId: "corr-1",
      causationId: "cause-1",
    };

    await createApplicationExecuteHandler()(makeJob("wrong", data));
  });
});
