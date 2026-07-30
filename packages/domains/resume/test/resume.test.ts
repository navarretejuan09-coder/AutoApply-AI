import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ResumeStatus } from "@autoapply/contracts";

import { extractSkills } from "../src/parser/extract-skills.js";
import { summarizeText } from "../src/parser/summarize.js";
import {
  getResumeForUser,
  listResumesByUser,
  parseResume,
  setResumeRepository,
  uploadResume,
} from "../src/index.js";
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
});

describe("resume parser helpers", () => {
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

  it("summarizeText truncates long content", () => {
    const longText = "word ".repeat(200).trim();
    const summary = summarizeText(longText);

    assert.ok(summary.length <= 501);
    assert.ok(summary.endsWith("…"));
  });
});
