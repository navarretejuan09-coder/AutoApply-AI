import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import "reflect-metadata";
import "../src/load-env.js";

import {
  APPLICATION_EXECUTE_JOB_NAME,
  APPLICATION_QUEUE_NAME,
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  JOB_QUEUE_NAME,
  CORRELATION_ID_HEADER,
  RESUME_PARSE_JOB_NAME,
  RESUME_QUEUE_NAME,
  type ApplicationExecuteJobData,
  type HealthPingJobData,
  type JobMatchJobData,
  type ResumeParseJobData,
} from "@autoapply/contracts";
import { createJobsDomain, type JobsDomain } from "@autoapply/jobs";
import { InMemoryJobRepository } from "@autoapply/jobs/testing";
import { resetResumeRepository, setResumeRepository } from "@autoapply/resume";
import { InMemoryResumeRepository } from "@autoapply/resume/testing";
import { resetUserRepository, setUserRepository } from "@autoapply/user";
import { InMemoryUserRepository } from "@autoapply/user/testing";
import {
  resetApplicationJobLookup,
  resetApplicationRepository,
  setApplicationJobLookup,
  setApplicationRepository,
} from "@autoapply/applications";
import { InMemoryApplicationRepository } from "@autoapply/applications/testing";
import {
  resetBrowserSessionRepository,
  setBrowserSessionRepository,
} from "@autoapply/browser-session";
import { InMemoryBrowserSessionRepository } from "@autoapply/browser-session/testing";
import { NotFoundException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";
import { signJwt } from "@autoapply/auth";
import { config } from "@autoapply/config";

import { HealthController } from "../src/health/health.controller.js";
import { JobsController } from "../src/jobs/jobs.controller.js";
import { JobsService } from "../src/jobs/jobs.service.js";
import { ApplicationsController } from "../src/applications/applications.controller.js";
import { ApplicationsService } from "../src/applications/applications.service.js";
import { BrowserSessionsController } from "../src/browser-sessions/browser-sessions.controller.js";
import { ResumesController } from "../src/resumes/resumes.controller.js";
import { ResumesService } from "../src/resumes/resumes.service.js";
import { UsersController } from "../src/users/users.controller.js";
import {
  type EnqueueableQueue,
  type QueueConnection,
  type QueueServiceDeps,
  createQueueDeps,
  QueueService,
} from "../src/queue/queue.service.js";
import { RequestContextService } from "../src/common/request-context.service.js";
import { CorrelationIdInterceptor } from "../src/common/correlation-id.interceptor.js";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard.js";
import { UsersService } from "../src/users/users.service.js";

afterEach(() => {
  resetUserRepository();
  resetResumeRepository();
  resetBrowserSessionRepository();
  resetApplicationRepository();
  resetApplicationJobLookup();
});

function createTestJobsDomain(): JobsDomain {
  return createJobsDomain({
    repository: new InMemoryJobRepository(),
    resumeLookup: async () => null,
    runJobMatch: async () => ({ score: 50, rationale: "ok" }),
  });
}

function createMockQueue<T>(
  add: EnqueueableQueue<T>["add"] = async () => ({ id: "noop" }),
): EnqueueableQueue<T> {
  return {
    add,
    close: async () => undefined,
  };
}

function createTestQueueDeps(
  overrides: {
    connection?: QueueConnection;
    healthQueue?: EnqueueableQueue<HealthPingJobData>;
    resumeQueue?: EnqueueableQueue<ResumeParseJobData>;
    jobsQueue?: EnqueueableQueue<JobMatchJobData>;
    applicationsQueue?: EnqueueableQueue<ApplicationExecuteJobData>;
  } = {},
): QueueServiceDeps {
  return {
    connection: overrides.connection ?? { quit: async () => "OK" },
    healthQueue: overrides.healthQueue ?? createMockQueue(),
    resumeQueue: overrides.resumeQueue ?? createMockQueue(),
    jobsQueue: overrides.jobsQueue ?? createMockQueue(),
    applicationsQueue: overrides.applicationsQueue ?? createMockQueue(),
  };
}

describe("HealthController", () => {
  it("returns ok status payload", () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    assert.equal(result.status, "ok");
    assert.equal(result.service, "api");
    assert.ok(result.timestamp);
  });
});

describe("RequestContextService", () => {
  it("stores and clears correlation id", () => {
    const ctx = new RequestContextService();
    assert.equal(ctx.getCorrelationId(), undefined);

    ctx.setCorrelationId("corr-123");
    assert.equal(ctx.getCorrelationId(), "corr-123");

    ctx.clear();
    assert.equal(ctx.getCorrelationId(), undefined);
  });
});

describe("UsersService", () => {
  it("findById returns user when found", async () => {
    const repo = new InMemoryUserRepository();
    repo.seed({ id: "u1", email: "a@b.com", name: "A", passwordHash: "hash" });
    setUserRepository(repo);

    const service = new UsersService();
    const user = await service.findById("u1");
    assert.equal(user.email, "a@b.com");
  });

  it("findById throws NotFoundException when missing", async () => {
    setUserRepository(new InMemoryUserRepository());
    const service = new UsersService();
    await assert.rejects(() => service.findById("missing"), NotFoundException);
  });
});

describe("JobsService", () => {
  it("createAndEnqueue returns job and queue metadata", async () => {
    const jobs = createTestJobsDomain();
    const queueService = {
      enqueueJobMatch: async () => ({ id: "queue-1", queueName: JOB_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new JobsService(queueService, jobs);
    const result = await service.createAndEnqueue("u1", {
      title: "Engineer",
      company: "Acme",
      description: "Build",
    });

    assert.equal(result.job.id, "job-1");
    assert.equal(result.queueJobId, "queue-1");
    assert.equal(result.queue, JOB_QUEUE_NAME);
  });

  it("createAndEnqueue marks job failed when queue job id is missing", async () => {
    const jobs = createTestJobsDomain();
    const queueService = {
      enqueueJobMatch: async () => ({ id: undefined, queueName: JOB_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new JobsService(queueService, jobs);

    await assert.rejects(
      () =>
        service.createAndEnqueue("u1", {
          title: "Engineer",
          company: "Acme",
          description: "Build",
        }),
      /Failed to enqueue job match/,
    );

    const listed = await jobs.listJobsByUser("u1");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.status, "failed");
    assert.match(listed[0]?.errorMessage ?? "", /Failed to enqueue job match/);
  });
});

describe("ResumesService", () => {
  it("uploadAndEnqueue returns resume and job metadata", async () => {
    setResumeRepository(new InMemoryResumeRepository());

    const queueService = {
      enqueueResumeParse: async () => ({ id: "queue-2", queueName: RESUME_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new ResumesService(queueService);
    const result = await service.uploadAndEnqueue(
      "u1",
      "cv.pdf",
      "application/pdf",
      Buffer.from("pdf"),
    );

    assert.equal(result.resume.id, "resume-1");
    assert.equal(result.jobId, "queue-2");
    assert.equal(result.queue, RESUME_QUEUE_NAME);
  });

  it("uploadAndEnqueue throws when queue job id is missing", async () => {
    setResumeRepository(new InMemoryResumeRepository());

    const queueService = {
      enqueueResumeParse: async () => ({ id: undefined, queueName: RESUME_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new ResumesService(queueService);

    await assert.rejects(
      () => service.uploadAndEnqueue("u1", "cv.pdf", "application/pdf", Buffer.from("x")),
      /Failed to enqueue resume parse job/,
    );
  });
});

describe("QueueService", () => {
  it("createQueueDeps wires infrastructure factories", () => {
    const connection: QueueConnection = { quit: async () => "OK" };
    const healthQueue = createMockQueue<HealthPingJobData>();
    const resumeQueue = createMockQueue<ResumeParseJobData>();
    const jobsQueue = createMockQueue<JobMatchJobData>();
    const applicationsQueue = createMockQueue<ApplicationExecuteJobData>();

    const deps = createQueueDeps({
      createConnection: () => connection,
      createHealthQueue: (conn) => {
        assert.equal(conn, connection);
        return healthQueue;
      },
      createResumeQueue: () => resumeQueue,
      createJobsQueue: () => jobsQueue,
      createApplicationsQueue: () => applicationsQueue,
    });

    assert.equal(deps.connection, connection);
    assert.equal(deps.healthQueue, healthQueue);
    assert.equal(deps.resumeQueue, resumeQueue);
    assert.equal(deps.jobsQueue, jobsQueue);
    assert.equal(deps.applicationsQueue, applicationsQueue);
  });

  it("enqueue methods use request correlation id when set", async () => {
    const ctx = new RequestContextService();
    ctx.setCorrelationId("corr-from-request");

    const healthAdd = mock.fn(async () => ({ id: "h1", queueName: "health" }));
    const resumeAdd = mock.fn(async () => ({ id: "r1", queueName: "resume" }));
    const jobsAdd = mock.fn(async () => ({ id: "j1", queueName: "jobs" }));

    const service = new QueueService(
      ctx,
      createTestQueueDeps({
        healthQueue: { add: healthAdd, close: async () => undefined },
        resumeQueue: { add: resumeAdd, close: async () => undefined },
        jobsQueue: { add: jobsAdd, close: async () => undefined },
      }),
    );

    await service.enqueueHealthPing("api-test");
    await service.enqueueResumeParse("resume-1", "u1");
    await service.enqueueJobMatch("job-1", "u1");
    await service.onModuleDestroy();

    assert.equal(healthAdd.mock.callCount(), 1);
    assert.equal(healthAdd.mock.calls[0]?.arguments[0], HEALTH_PING_JOB_NAME);
    assert.equal(
      (healthAdd.mock.calls[0]?.arguments[1] as { correlationId: string }).correlationId,
      "corr-from-request",
    );

    assert.equal(resumeAdd.mock.callCount(), 1);
    assert.equal(resumeAdd.mock.calls[0]?.arguments[0], RESUME_PARSE_JOB_NAME);

    assert.equal(jobsAdd.mock.callCount(), 1);
    assert.equal(jobsAdd.mock.calls[0]?.arguments[0], JOB_MATCH_JOB_NAME);

    const applicationsAdd = mock.fn(async () => ({ id: "a1", queueName: APPLICATION_QUEUE_NAME }));
    const appService = new QueueService(
      ctx,
      createTestQueueDeps({
        applicationsQueue: { add: applicationsAdd, close: async () => undefined },
      }),
    );
    await appService.enqueueApplicationExecute({
      applicationId: "app-1",
      userId: "u1",
      jobId: "job-1",
      provider: "linkedin",
    });
    assert.equal(applicationsAdd.mock.callCount(), 1);
    assert.equal(applicationsAdd.mock.calls[0]?.arguments[0], APPLICATION_EXECUTE_JOB_NAME);
  });

  it("enqueue methods generate correlation ids when context is empty", async () => {
    const ctx = new RequestContextService();
    const healthAdd = mock.fn(async () => ({ id: "h1", queueName: "health" }));

    const service = new QueueService(
      ctx,
      createTestQueueDeps({
        healthQueue: { add: healthAdd, close: async () => undefined },
      }),
    );

    await service.enqueueHealthPing("api-test");

    const payload = healthAdd.mock.calls[0]?.arguments[1] as { correlationId: string };
    assert.ok(payload.correlationId.length > 0);
  });
});

describe("JwtAuthGuard", () => {
  it("accepts valid bearer tokens", async () => {
    const token = await signJwt({ sub: "u1", email: "a@b.com", name: "A" }, config.auth.secret);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;

    const guard = new JwtAuthGuard();
    assert.equal(await guard.canActivate(context), true);
    assert.equal(request.user.sub, "u1");
  });

  it("rejects missing or invalid tokens", async () => {
    const guard = new JwtAuthGuard();
    const missing = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as ExecutionContext;

    await assert.rejects(() => guard.canActivate(missing), UnauthorizedException);

    const invalid = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: "Bearer not-a-jwt" } }),
      }),
    } as ExecutionContext;

    await assert.rejects(() => guard.canActivate(invalid), UnauthorizedException);
  });
});

describe("CorrelationIdInterceptor", () => {
  it("uses incoming correlation header when present", async () => {
    const ctx = new RequestContextService();
    const interceptor = new CorrelationIdInterceptor(ctx);
    const request = { headers: { [CORRELATION_ID_HEADER]: "incoming-id" } };
    const response = { setHeader: mock.fn() };
    const context = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as ExecutionContext;
    const next: CallHandler = { handle: () => of("ok") };

    await new Promise<void>((resolve, reject) => {
      interceptor.intercept(context, next).subscribe({
        complete: () => {
          try {
            assert.equal(ctx.getCorrelationId(), undefined);
            assert.equal(response.setHeader.mock.calls[0]?.arguments[1], "incoming-id");
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error: reject,
      });
    });
  });
});

describe("API controllers", () => {
  it("JobsController delegates to service and maps errors", async () => {
    const jobsService = {
      createAndEnqueue: async () => ({ job: { id: "j1" }, queueJobId: "q1", queue: "jobs" }),
      listForUser: async () => [{ id: "j1" }],
      getForUser: async (_id: string, userId: string) => (userId === "u1" ? { id: "j1" } : null),
      archiveForUser: async (_id: string, userId: string) => userId === "u1",
    } as unknown as JobsService;

    const controller = new JobsController(jobsService);
    const user = { sub: "u1", email: "a@b.com" };

    const created = await controller.createJob(user, {
      title: "Engineer",
      company: "Acme",
      description: "Build",
    });
    assert.equal(created.job.id, "j1");

    const list = await controller.listJobs(user);
    assert.equal(list.jobs.length, 1);

    assert.equal((await controller.getJob(user, "j1")).id, "j1");
    await assert.rejects(
      () => controller.getJob({ sub: "u2", email: "x@y.com" }, "j1"),
      NotFoundException,
    );

    assert.deepEqual(await controller.deleteJob(user, "j1"), { ok: true });

    const badService = {
      createAndEnqueue: async () => {
        throw new Error("bad input");
      },
    } as unknown as JobsService;
    await assert.rejects(
      () =>
        new JobsController(badService).createJob(user, {
          title: "x",
          company: "y",
          description: "z",
        }),
      BadRequestException,
    );
  });

  it("ResumesController validates upload and maps not found", async () => {
    const resumesService = {
      uploadAndEnqueue: async () => ({ resume: { id: "r1" }, jobId: "q1", queue: "resume" }),
      listForUser: async () => [{ id: "r1" }],
      getForUser: async () => null,
    } as unknown as ResumesService;

    const controller = new ResumesController(resumesService);
    const user = { sub: "u1", email: "a@b.com" };

    await assert.rejects(() => controller.uploadResume(user, undefined), BadRequestException);

    const uploaded = await controller.uploadResume(user, {
      originalname: "cv.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("pdf"),
    } as { originalname: string; mimetype: string; buffer: Buffer });
    assert.equal(uploaded.resume.id, "r1");

    const list = await controller.listResumes(user);
    assert.equal(list.resumes.length, 1);

    await assert.rejects(() => controller.getResume(user, "missing"), NotFoundException);

    const failingService = {
      uploadAndEnqueue: async () => {
        throw new Error("bad upload");
      },
    } as unknown as ResumesService;
    await assert.rejects(
      () =>
        new ResumesController(failingService).uploadResume(user, {
          originalname: "cv.pdf",
          mimetype: "application/pdf",
          buffer: Buffer.from("pdf"),
        } as { originalname: string; mimetype: string; buffer: Buffer }),
      BadRequestException,
    );
  });

  it("UsersController returns profile and enqueues ping", async () => {
    const usersService = {
      findById: async () => ({ id: "u1", email: "a@b.com", name: "A" }),
    } as unknown as UsersService;
    const queueService = {
      enqueueHealthPing: async () => ({ id: "q1", queueName: "health", name: "ping" }),
    } as unknown as QueueService;

    const controller = new UsersController(usersService, queueService);
    const user = { sub: "u1", email: "a@b.com" };

    assert.equal((await controller.getMe(user)).email, "a@b.com");
    const ping = await controller.enqueuePing(user);
    assert.equal(ping.jobId, "q1");
  });

  it("ApplicationsController delegates to service and maps errors", async () => {
    const applicationsService = {
      createAndEnqueue: async () => ({
        application: { id: "app-1", status: "queued" },
        queueJobId: "q-app",
      }),
      listForUser: async () => [{ id: "app-1" }],
      getForUser: async (_id: string, userId: string) => (userId === "u1" ? { id: "app-1" } : null),
    } as unknown as ApplicationsService;

    const controller = new ApplicationsController(applicationsService);
    const user = { sub: "u1", email: "a@b.com" };

    const created = await controller.createApplication(user, { jobId: "job-1" });
    assert.equal(created.application.id, "app-1");

    const list = await controller.listApplications(user);
    assert.equal(list.applications.length, 1);

    assert.equal((await controller.getApplication(user, "app-1")).application.id, "app-1");
    await assert.rejects(
      () => controller.getApplication({ sub: "u2", email: "x@y.com" }, "app-1"),
      NotFoundException,
    );

    const badService = {
      createAndEnqueue: async () => {
        throw new Error("duplicate");
      },
    } as unknown as ApplicationsService;
    await assert.rejects(
      () => new ApplicationsController(badService).createApplication(user, { jobId: "job-1" }),
      BadRequestException,
    );
  });

  it("BrowserSessionsController upserts and returns status", async () => {
    const controller = new BrowserSessionsController();
    const user = { sub: "u1", email: "a@b.com" };

    setBrowserSessionRepository(new InMemoryBrowserSessionRepository());

    const saved = await controller.upsertSession(user, "linkedin", {
      storageStateJson: '{"cookies":[]}',
    });
    assert.equal(saved.provider, "linkedin");

    const status = await controller.getSessionStatus(user, "linkedin");
    assert.equal(status.configured, true);
  });
});

describe("service delegates", () => {
  it("JobsService list/get/archive delegate to domain", async () => {
    const service = new JobsService({} as QueueService, createTestJobsDomain());
    assert.deepEqual(await service.listForUser("u1"), []);
    assert.equal(await service.getForUser("j1", "u1"), null);
    assert.equal(await service.archiveForUser("j1", "u1"), false);
  });

  it("ResumesService list/get delegate to domain", async () => {
    setResumeRepository(new InMemoryResumeRepository());
    const service = new ResumesService({} as QueueService);
    assert.deepEqual(await service.listForUser("u1"), []);
    assert.equal(await service.getForUser("r1", "u1"), null);
  });

  it("ApplicationsService createAndEnqueue calls queue", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => ({
      id: "job-1",
      userId: "u1",
      title: "Eng",
      company: "Acme",
      url: "https://linkedin.com/jobs/1",
      location: null,
      description: "d",
      status: "matched",
      matchScore: 1,
      matchRationale: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const queueService = {
      enqueueApplicationExecute: async () => ({ id: "q1" }),
    } as unknown as QueueService;

    const service = new ApplicationsService(queueService);
    const result = await service.createAndEnqueue("u1", { jobId: "job-1" });
    assert.equal(result.application.status, "queued");
    assert.equal(result.queueJobId, "q1");
  });

  it("ApplicationsService list/get delegate to domain", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => ({
      id: "job-1",
      userId: "u1",
      title: "Eng",
      company: "Acme",
      url: "https://linkedin.com/jobs/1",
      location: null,
      description: "d",
      status: "matched",
      matchScore: 1,
      matchRationale: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const queueService = {
      enqueueApplicationExecute: async () => ({ id: "q1" }),
    } as unknown as QueueService;

    const service = new ApplicationsService(queueService);
    const created = await service.createAndEnqueue("u1", { jobId: "job-1" });
    assert.equal((await service.listForUser("u1")).length, 1);
    assert.equal(
      (await service.getForUser(created.application.id, "u1"))?.id,
      created.application.id,
    );
  });

  it("ApplicationsService throws when queue job id missing", async () => {
    setApplicationRepository(new InMemoryApplicationRepository());
    setApplicationJobLookup(async () => ({
      id: "job-1",
      userId: "u1",
      title: "Eng",
      company: "Acme",
      url: "https://linkedin.com/jobs/1",
      location: null,
      description: "d",
      status: "matched",
      matchScore: 1,
      matchRationale: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const queueService = {
      enqueueApplicationExecute: async () => ({ id: undefined }),
    } as unknown as QueueService;

    const service = new ApplicationsService(queueService);
    await assert.rejects(
      () => service.createAndEnqueue("u1", { jobId: "job-1" }),
      /Failed to enqueue application execute/,
    );
  });
});
