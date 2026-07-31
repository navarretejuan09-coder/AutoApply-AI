import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APPLICATION_EXECUTE_JOB_NAME,
  APPLICATION_QUEUE_NAME,
  CORRELATION_ID_HEADER,
  DEFAULT_RESUME_MAX_BYTES,
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  JOB_MATCH_JOB_NAME,
  JOB_QUEUE_NAME,
  JobQueueName,
  RESUME_PARSE_JOB_NAME,
  RESUME_QUEUE_NAME,
  ServiceName,
  type ApplicationSubmittedPayload,
  type HealthCheckResponse,
  type HealthPingJobData,
  type HealthPingRequestedPayload,
  type JobDto,
  type JobFoundPayload,
  type JobMatchJobData,
  type ResumeDto,
  type ResumeParseJobData,
  type ResumeParsedPayload,
  type ResumeUploadedPayload,
  type UserRegisteredPayload,
} from "../src/index.js";

describe("enums", () => {
  it("ServiceName has expected members", () => {
    assert.equal(ServiceName.Web, "web");
    assert.equal(ServiceName.Api, "api");
    assert.equal(ServiceName.Worker, "worker");
    assert.equal(ServiceName.Browser, "browser");
  });

  it("JobQueueName has expected members", () => {
    assert.equal(JobQueueName.Health, "health");
    assert.equal(JobQueueName.Resume, "resume");
    assert.equal(JobQueueName.Jobs, "jobs");
    assert.equal(JobQueueName.Applications, "applications");
  });
});

describe("queue constants", () => {
  it("exports health queue identifiers", () => {
    assert.equal(HEALTH_QUEUE_NAME, "health");
    assert.equal(HEALTH_PING_JOB_NAME, "health.ping");
  });

  it("exports resume queue identifiers", () => {
    assert.equal(RESUME_QUEUE_NAME, "resume");
    assert.equal(RESUME_PARSE_JOB_NAME, "resume.parse");
  });

  it("exports jobs queue identifiers", () => {
    assert.equal(JOB_QUEUE_NAME, "jobs");
    assert.equal(JOB_MATCH_JOB_NAME, "job.match");
  });

  it("exports applications queue identifiers", () => {
    assert.equal(APPLICATION_QUEUE_NAME, "applications");
    assert.equal(APPLICATION_EXECUTE_JOB_NAME, "application.execute");
  });
});

describe("correlation header", () => {
  it("exports the correlation id header name", () => {
    assert.equal(CORRELATION_ID_HEADER, "x-correlation-id");
  });
});

describe("resume defaults", () => {
  it("DEFAULT_RESUME_MAX_BYTES is 5 MiB", () => {
    assert.equal(DEFAULT_RESUME_MAX_BYTES, 5_242_880);
  });
});

describe("event payload fixtures", () => {
  it("HealthPingRequestedPayload", () => {
    const payload: HealthPingRequestedPayload = {
      source: "worker",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(payload.source, "worker");
  });

  it("UserRegisteredPayload", () => {
    const payload: UserRegisteredPayload = { userId: "u1", email: "user@example.com" };
    assert.equal(payload.email, "user@example.com");
  });

  it("JobFoundPayload", () => {
    const payload: JobFoundPayload = {
      jobId: "j1",
      title: "Engineer",
      company: "Acme",
      url: "https://example.com/jobs/1",
      provider: "greenhouse",
    };
    assert.equal(payload.provider, "greenhouse");
  });

  it("ResumeUploadedPayload", () => {
    const payload: ResumeUploadedPayload = {
      resumeId: "r1",
      userId: "u1",
      fileName: "resume.pdf",
    };
    assert.equal(payload.fileName, "resume.pdf");
  });

  it("ResumeParsedPayload", () => {
    const payload: ResumeParsedPayload = {
      resumeId: "r1",
      userId: "u1",
      skills: ["TypeScript"],
      summary: "Backend engineer",
    };
    assert.deepEqual(payload.skills, ["TypeScript"]);
  });

  it("ApplicationSubmittedPayload", () => {
    const payload: ApplicationSubmittedPayload = {
      applicationId: "a1",
      jobId: "j1",
      userId: "u1",
      status: "queued",
    };
    assert.equal(payload.status, "queued");
  });
});

describe("queue job data fixtures", () => {
  it("HealthPingJobData", () => {
    const data: HealthPingJobData = {
      source: "api",
      timestamp: "2026-01-01T00:00:00.000Z",
      correlationId: "c1",
      causationId: "ca1",
    };
    assert.equal(data.correlationId, "c1");
  });

  it("ResumeParseJobData", () => {
    const data: ResumeParseJobData = {
      resumeId: "r1",
      userId: "u1",
      correlationId: "c1",
      causationId: "ca1",
    };
    assert.equal(data.resumeId, "r1");
  });

  it("JobMatchJobData", () => {
    const data: JobMatchJobData = {
      jobId: "j1",
      userId: "u1",
      correlationId: "c1",
      causationId: "ca1",
    };
    assert.equal(data.jobId, "j1");
  });
});

describe("api dto fixtures", () => {
  it("HealthCheckResponse", () => {
    const response: HealthCheckResponse = {
      status: "ok",
      service: "api",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(response.status, "ok");
  });

  it("ResumeDto", () => {
    const resume: ResumeDto = {
      id: "r1",
      userId: "u1",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      status: "parsed",
      skills: ["Node"],
      summary: "Developer",
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(resume.status, "parsed");
  });

  it("JobDto", () => {
    const job: JobDto = {
      id: "j1",
      userId: "u1",
      title: "Engineer",
      company: "Acme",
      url: null,
      location: "Remote",
      description: "Build things",
      status: "pending",
      matchScore: null,
      matchRationale: null,
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(job.status, "pending");
  });
});
