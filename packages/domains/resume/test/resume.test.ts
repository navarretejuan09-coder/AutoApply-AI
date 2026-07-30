import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { ResumeStatus } from "@autoapply/contracts";
import { config } from "@autoapply/config";

import { extractSkills } from "../src/parser/extract-skills.js";
import {
  extractTextFromResume,
  isSupportedResumeMimeType,
} from "../src/parser/extract-text.js";
import { summarizeText } from "../src/parser/summarize.js";
import {
  getLatestParsedResumeForMatching,
  getResumeForUser,
  listResumesByUser,
  parseResume,
  resetExtractTextFromResume,
  setExtractTextFromResume,
  setResumeRepository,
  uploadResume,
} from "../src/index.js";
import { toResumeDto } from "../src/repository/resume.repository.js";
import type {
  CreateResumeInput,
  ParseWrite,
  ResumeBlob,
  ResumeMetadata,
  ResumeRepository,
} from "../src/repository/resume.repository.js";

class InMemoryResumeRepository implements ResumeRepository {
  private records = new Map<
    string,
    ResumeMetadata & {
      content: Buffer;
    }
  >();

  private toMetadata(
    record: ResumeMetadata & {
      content: Buffer;
    },
  ): ResumeMetadata {
    return {
      id: record.id,
      userId: record.userId,
      fileName: record.fileName,
      mimeType: record.mimeType,
      status: record.status,
      extractedText: record.extractedText,
      skills: record.skills,
      summary: record.summary,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(input: CreateResumeInput): Promise<ResumeMetadata> {
    const now = new Date();
    const record = {
      id: `resume-${this.records.size + 1}`,
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      content: input.content,
      status: "pending" as const,
      extractedText: null,
      skills: [] as string[],
      summary: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    return this.toMetadata(record);
  }

  async findBlobByIdForUser(id: string, userId: string): Promise<ResumeBlob | null> {
    const record = this.records.get(id);
    if (!record || record.userId !== userId) {
      return null;
    }

    return {
      id: record.id,
      userId: record.userId,
      mimeType: record.mimeType,
      content: record.content,
    };
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeMetadata | null> {
    const record = this.records.get(id);
    return record?.userId === userId ? this.toMetadata(record) : null;
  }

  async findLatestParsedForUser(userId: string): Promise<ResumeMetadata | null> {
    const parsed = [...this.records.values()]
      .filter((record) => record.userId === userId && record.status === "parsed")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const latest = parsed[0];
    return latest ? this.toMetadata(latest) : null;
  }

  async listByUserId(userId: string): Promise<ResumeMetadata[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((record) => this.toMetadata(record));
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<void> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    this.records.set(id, { ...record, status, updatedAt: new Date() });
  }

  async updateParseResult(id: string, input: ParseWrite): Promise<ResumeMetadata> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    const updated =
      input.status === "parsed"
        ? {
            ...record,
            status: "parsed" as const,
            extractedText: input.extractedText,
            skills: input.skills,
            summary: input.summary,
            errorMessage: null,
            updatedAt: new Date(),
          }
        : {
            ...record,
            status: "failed" as const,
            errorMessage: input.errorMessage,
            updatedAt: new Date(),
          };

    this.records.set(id, updated);
    return this.toMetadata(updated);
  }
}

describe("resume domain", () => {
  afterEach(() => {
    resetExtractTextFromResume();
  });

  it("uploadResume persists pending resume without content in DTO", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);

    const dto = await uploadResume({
      userId: "user-1",
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("placeholder"),
    });

    assert.equal(dto.status, "pending");
    assert.equal(dto.userId, "user-1");
    assert.deepEqual(dto.skills, []);
    assert.equal(dto.summary, null);
  });

  it("uploadResume rejects unsupported mime types", async () => {
    setResumeRepository(new InMemoryResumeRepository());

    await assert.rejects(
      () =>
        uploadResume({
          userId: "user-1",
          fileName: "resume.txt",
          mimeType: "text/plain",
          content: Buffer.from("hello"),
        }),
      /Unsupported file type/,
    );
  });

  it("listResumesByUser and getResumeForUser enforce ownership", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("placeholder"),
    });

    const list = await listResumesByUser("user-1");
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, uploaded.id);

    const owned = await getResumeForUser(uploaded.id, "user-1");
    assert.equal(owned?.id, uploaded.id);

    const foreign = await getResumeForUser(uploaded.id, "user-2");
    assert.equal(foreign, null);
  });

  it("parseResume marks failed when text extraction fails", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("not-a-valid-docx"),
    });

    await assert.rejects(() =>
      parseResume({
        resumeId: uploaded.id,
        userId: "user-1",
      }),
    );

    const record = await repo.findByIdForUser(uploaded.id, "user-1");
    assert.equal(record?.status, "failed");
    assert.ok(record?.errorMessage);
  });

  it("parseResume rejects foreign userId", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("placeholder"),
    });

    await assert.rejects(
      () =>
        parseResume({
          resumeId: uploaded.id,
          userId: "user-2",
        }),
      /Resume not found/,
    );
  });

  it("uploadResume rejects empty content", async () => {
    setResumeRepository(new InMemoryResumeRepository());

    await assert.rejects(
      () =>
        uploadResume({
          userId: "user-1",
          fileName: "resume.pdf",
          mimeType: "application/pdf",
          content: Buffer.alloc(0),
        }),
      /empty/,
    );
  });

  it("uploadResume rejects files exceeding max size", async () => {
    setResumeRepository(new InMemoryResumeRepository());

    await assert.rejects(
      () =>
        uploadResume({
          userId: "user-1",
          fileName: "huge.pdf",
          mimeType: "application/pdf",
          content: Buffer.alloc(config.resume.maxBytes + 1),
        }),
      /maximum size/,
    );
  });

  it("getLatestParsedResumeForMatching returns parsed resume context", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: Buffer.from("placeholder"),
    });

    await repo.updateParseResult(uploaded.id, {
      status: "parsed",
      extractedText: "TypeScript engineer",
      skills: ["TypeScript"],
      summary: "Backend dev",
    });

    const match = await getLatestParsedResumeForMatching("user-1");
    assert.equal(match?.resumeId, uploaded.id);
    assert.deepEqual(match?.skills, ["TypeScript"]);
    assert.equal(match?.extractedText, "TypeScript engineer");
  });

  it("getLatestParsedResumeForMatching returns null without parsed resume", async () => {
    setResumeRepository(new InMemoryResumeRepository());
    assert.equal(await getLatestParsedResumeForMatching("user-1"), null);
  });

  it("parseResume succeeds when text extraction returns content", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);
    setExtractTextFromResume(async () => "Senior TypeScript and React developer");

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("pdf-bytes"),
    });

    const parsed = await parseResume({
      resumeId: uploaded.id,
      userId: "user-1",
    });

    assert.equal(parsed.resumeId, uploaded.id);
    assert.ok(parsed.skills.includes("TypeScript"));
    assert.ok(parsed.summary.length > 0);
  });

  it("parseResume fails when extracted text is empty", async () => {
    const repo = new InMemoryResumeRepository();
    setResumeRepository(repo);
    setExtractTextFromResume(async () => "");

    const uploaded = await uploadResume({
      userId: "user-1",
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("pdf-bytes"),
    });

    await assert.rejects(() =>
      parseResume({
        resumeId: uploaded.id,
        userId: "user-1",
      }),
    );

    const record = await repo.findByIdForUser(uploaded.id, "user-1");
    assert.equal(record?.status, "failed");
  });
});

describe("resume repository helpers", () => {
  it("toResumeDto serializes dates to ISO strings", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const dto = toResumeDto({
      id: "r1",
      userId: "u1",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      status: "parsed",
      extractedText: "text",
      skills: ["Go"],
      summary: "summary",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    assert.equal(dto.createdAt, now.toISOString());
    assert.equal(dto.updatedAt, now.toISOString());
    assert.deepEqual(dto.skills, ["Go"]);
  });
});

describe("PrismaResumeRepository", () => {
  it("maps prisma records through repository methods", async () => {
    const { PrismaResumeRepository } = await import("../src/repository/prisma-resume.repository.js");
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = {
      id: "r1",
      userId: "u1",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      status: "pending" as const,
      extractedText: null,
      skills: [] as string[],
      summary: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    const db = {
      resume: {
        create: async () => metadata,
        findFirst: async (args: { where: { id?: string; userId?: string; status?: string } }) => {
          if (args.where.status === "parsed") {
            return { ...metadata, status: "parsed", extractedText: "text", skills: ["Go"] };
          }
          return { ...metadata, content: new Uint8Array([1, 2, 3]) };
        },
        findMany: async () => [metadata],
        update: async (args: { data: { status?: string; errorMessage?: string } }) => ({
          ...metadata,
          status: (args.data.status ?? metadata.status) as typeof metadata.status,
          errorMessage: args.data.errorMessage ?? null,
          extractedText: args.data.status === "parsed" ? "text" : null,
          skills: args.data.status === "parsed" ? ["Go"] : [],
          summary: args.data.status === "parsed" ? "summary" : null,
        }),
      },
    };

    const repo = new PrismaResumeRepository(db as never);

    const created = await repo.create({
      userId: "u1",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("pdf"),
    });
    assert.equal(created.id, "r1");

    const blob = await repo.findBlobByIdForUser("r1", "u1");
    assert.ok(blob?.content);

    assert.ok(await repo.findByIdForUser("r1", "u1"));
    assert.ok(await repo.findLatestParsedForUser("u1"));
    assert.equal((await repo.listByUserId("u1")).length, 1);
    await repo.updateStatus("r1", "processing");

    const parsed = await repo.updateParseResult("r1", {
      status: "parsed",
      extractedText: "text",
      skills: ["Go"],
      summary: "summary",
    });
    assert.equal(parsed.status, "parsed");

    const failed = await repo.updateParseResult("r1", {
      status: "failed",
      errorMessage: "bad file",
    });
    assert.equal(failed.status, "failed");
  });
});

describe("resume parser helpers", () => {
  it("isSupportedResumeMimeType recognizes allowed types", () => {
    assert.equal(isSupportedResumeMimeType("application/pdf"), true);
    assert.equal(isSupportedResumeMimeType("text/plain"), false);
  });

  it("extractTextFromResume rejects unsupported mime types", async () => {
    await assert.rejects(
      () => extractTextFromResume(Buffer.from("x"), "text/plain"),
      /Unsupported resume MIME type/,
    );
  });

  it("extractTextFromResume attempts docx extraction for docx mime type", async () => {
    await assert.rejects(
      () =>
        extractTextFromResume(
          Buffer.from("not-a-docx"),
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      /end of central directory|zip file/i,
    );
  });

  it("extractSkills finds known skills case-insensitively", () => {
    const skills = extractSkills(
      "Experienced with TypeScript, React, Node.js, PostgreSQL, and Docker.",
    );

    assert.ok(skills.includes("TypeScript"));
    assert.ok(skills.includes("React"));
    assert.ok(skills.includes("Node.js"));
    assert.ok(skills.includes("PostgreSQL"));
    assert.ok(skills.includes("Docker"));
  });

  it("summarizeText returns short text unchanged", () => {
    assert.equal(summarizeText("  short summary  "), "short summary");
  });

  it("summarizeText truncates without word boundary when needed", () => {
    const noSpaces = "x".repeat(600);
    const summary = summarizeText(noSpaces);
    assert.ok(summary.endsWith("…"));
    assert.ok(summary.length <= 502);
  });
});
