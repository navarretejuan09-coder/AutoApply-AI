import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import "reflect-metadata";
import "../src/load-env.js";

import {
  HEALTH_PING_JOB_NAME,
  JOB_MATCH_JOB_NAME,
  JOB_QUEUE_NAME,
  CORRELATION_ID_HEADER,
  RESUME_PARSE_JOB_NAME,
  RESUME_QUEUE_NAME,
} from "@autoapply/contracts";
import { setJobRepository } from "@autoapply/jobs";
import { setResumeRepository } from "@autoapply/resume";
import { setUserRepository } from "@autoapply/user";
import { NotFoundException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import type { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";
import { signJwt } from "@autoapply/auth";
import { config } from "@autoapply/config";

import { HealthController } from "../src/health/health.controller.js";
import { JobsController } from "../src/jobs/jobs.controller.js";
import { JobsService } from "../src/jobs/jobs.service.js";
import { ResumesController } from "../src/resumes/resumes.controller.js";
import { ResumesService } from "../src/resumes/resumes.service.js";
import { UsersController } from "../src/users/users.controller.js";
import { QueueService } from "../src/queue/queue.service.js";
import { RequestContextService } from "../src/common/request-context.service.js";
import { CorrelationIdInterceptor } from "../src/common/correlation-id.interceptor.js";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard.js";
import { UsersService } from "../src/users/users.service.js";

interface UserRepository {
  findById(id: string): Promise<{ id: string; email: string; name: string | null } | null>;
  findByEmail(email: string): Promise<unknown>;
  create(input: {
    email: string;
    passwordHash: string;
    name?: string | null;
  }): Promise<{ id: string; email: string; name: string | null }>;
  emailExists(email: string): Promise<boolean>;
}

interface ResumeRepository {
  create(input: {
    userId: string;
    fileName: string;
    mimeType: string;
    content: Buffer;
  }): Promise<{
    id: string;
    userId: string;
    fileName: string;
    mimeType: string;
    status: "pending";
    extractedText: null;
    skills: [];
    summary: null;
    errorMessage: null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findBlobByIdForUser(id: string, userId: string): Promise<null>;
  findByIdForUser(id: string, userId: string): Promise<null>;
  findLatestParsedForUser(userId: string): Promise<null>;
  listByUserId(userId: string): Promise<[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateParseResult(): Promise<never>;
}

interface JobRepository {
  create(input: {
    userId: string;
    title: string;
    company: string;
    description: string;
    url?: string | null;
    location?: string | null;
  }): Promise<{
    id: string;
    userId: string;
    title: string;
    company: string;
    url: string | null;
    location: string | null;
    description: string;
    status: "pending";
    matchScore: null;
    matchRationale: null;
    errorMessage: null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findByIdForUser(id: string, userId: string): Promise<null>;
  listByUserId(userId: string): Promise<[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateMatchResult(): Promise<never>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
}

class InMemoryUserRepository implements UserRepository {
  private records = new Map<string, { id: string; email: string; name: string | null; passwordHash: string }>();

  seed(user: { id: string; email: string; name: string | null }) {
    this.records.set(user.id, { ...user, passwordHash: "hash" });
  }

  async findById(id: string) {
    const record = this.records.get(id);
    return record ? { id: record.id, email: record.email, name: record.name } : null;
  }

  async findByEmail(email: string) {
    return [...this.records.values()].find((record) => record.email === email) ?? null;
  }

  async create(input: { email: string; passwordHash: string; name?: string | null }) {
    const id = `user-${this.records.size + 1}`;
    const record = { id, email: input.email, name: input.name ?? null, passwordHash: input.passwordHash };
    this.records.set(id, record);
    return { id: record.id, email: record.email, name: record.name };
  }

  async emailExists(email: string) {
    return [...this.records.values()].some((record) => record.email === email);
  }
}

class InMemoryResumeRepository implements ResumeRepository {
  async create(input: { userId: string; fileName: string; mimeType: string; content: Buffer }) {
    return {
      id: "resume-1",
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      status: "pending" as const,
      extractedText: null,
      skills: [],
      summary: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findBlobByIdForUser() {
    return null;
  }

  async findByIdForUser() {
    return null;
  }

  async findLatestParsedForUser() {
    return null;
  }

  async listByUserId() {
    return [];
  }

  async updateStatus() {}

  async updateParseResult() {
    throw new Error("not used");
  }
}

class InMemoryJobRepository implements JobRepository {
  async create(input: {
    userId: string;
    title: string;
    company: string;
    description: string;
    url?: string | null;
    location?: string | null;
  }) {
    return {
      id: "job-1",
      userId: input.userId,
      title: input.title,
      company: input.company,
      url: input.url ?? null,
      location: input.location ?? null,
      description: input.description,
      status: "pending" as const,
      matchScore: null,
      matchRationale: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findByIdForUser() {
    return null;
  }

  async listByUserId() {
    return [];
  }

  async updateStatus() {}

  async updateMatchResult() {
    throw new Error("not used");
  }

  async deleteForUser() {
    return true;
  }
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
    repo.seed({ id: "u1", email: "a@b.com", name: "A" });
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
    setJobRepository(new InMemoryJobRepository());

    const queueService = {
      enqueueJobMatch: async () => ({ id: "queue-1", queueName: JOB_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new JobsService(queueService);
    const result = await service.createAndEnqueue("u1", {
      title: "Engineer",
      company: "Acme",
      description: "Build",
    });

    assert.equal(result.job.id, "job-1");
    assert.equal(result.queueJobId, "queue-1");
    assert.equal(result.queue, JOB_QUEUE_NAME);
  });

  it("createAndEnqueue throws when queue job id is missing", async () => {
    setJobRepository(new InMemoryJobRepository());

    const queueService = {
      enqueueJobMatch: async () => ({ id: undefined, queueName: JOB_QUEUE_NAME }),
    } as unknown as QueueService;

    const service = new JobsService(queueService);

    await assert.rejects(
      () =>
        service.createAndEnqueue("u1", {
          title: "Engineer",
          company: "Acme",
          description: "Build",
        }),
      /Failed to enqueue job match/,
    );
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
  it("enqueue methods use request correlation id when set", async () => {
    const ctx = new RequestContextService();
    ctx.setCorrelationId("corr-from-request");

    const healthAdd = mock.fn(async () => ({ id: "h1", queueName: "health" }));
    const resumeAdd = mock.fn(async () => ({ id: "r1", queueName: "resume" }));
    const jobsAdd = mock.fn(async () => ({ id: "j1", queueName: "jobs" }));

    const service = new QueueService(ctx, {
      connection: { quit: async () => "OK" } as never,
      healthQueue: { add: healthAdd, close: async () => undefined } as never,
      resumeQueue: { add: resumeAdd, close: async () => undefined } as never,
      jobsQueue: { add: jobsAdd, close: async () => undefined } as never,
    });

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
  });

  it("enqueue methods generate correlation ids when context is empty", async () => {
    const ctx = new RequestContextService();
    const healthAdd = mock.fn(async () => ({ id: "h1", queueName: "health" }));

    const service = new QueueService(ctx, {
      connection: { quit: async () => "OK" } as never,
      healthQueue: { add: healthAdd, close: async () => undefined } as never,
      resumeQueue: { add: async () => ({ id: "r1" }), close: async () => undefined } as never,
      jobsQueue: { add: async () => ({ id: "j1" }), close: async () => undefined } as never,
    });

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
    await assert.rejects(() => controller.getJob({ sub: "u2", email: "x@y.com" }, "j1"), NotFoundException);

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
});

describe("service delegates", () => {
  it("JobsService list/get/archive delegate to domain", async () => {
    setJobRepository(new InMemoryJobRepository());
    const service = new JobsService({} as QueueService);
    assert.deepEqual(await service.listForUser("u1"), []);
    assert.equal(await service.getForUser("j1", "u1"), null);
    assert.equal(await service.archiveForUser("j1", "u1"), true);
  });

  it("ResumesService list/get delegate to domain", async () => {
    setResumeRepository(new InMemoryResumeRepository());
    const service = new ResumesService({} as QueueService);
    assert.deepEqual(await service.listForUser("u1"), []);
    assert.equal(await service.getForUser("r1", "u1"), null);
  });
});
