import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
  ResumeRecord,
  ResumeRepository,
  UpdateResumeParseResultInput,
} from "../src/repository/resume.repository.js";
import type { ResumeStatus } from "@autoapply/contracts";

class InMemoryResumeRepository implements ResumeRepository {
  private records = new Map<string, ResumeRecord>();

  async create(input: CreateResumeInput): Promise<ResumeRecord> {
    const now = new Date();
    const record: ResumeRecord = {
      id: `resume-${this.records.size + 1}`,
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      content: input.content,
      status: "pending",
      extractedText: null,
      skills: [],
      summary: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<ResumeRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ResumeRecord | null> {
    const record = this.records.get(id);
    return record?.userId === userId ? record : null;
  }

  async listByUserId(userId: string): Promise<ResumeRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<ResumeRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    const updated = { ...record, status, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async updateParseResult(id: string, input: UpdateResumeParseResultInput): Promise<ResumeRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Resume not found: ${id}`);
    }

    const updated: ResumeRecord = {
      ...record,
      status: input.status,
      extractedText: input.extractedText ?? record.extractedText,
      skills: input.skills ?? record.skills,
      summary: input.summary ?? record.summary,
      errorMessage: input.errorMessage ?? record.errorMessage,
      updatedAt: new Date(),
    };

    this.records.set(id, updated);
    return updated;
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

    await assert.rejects(() => parseResume(uploaded.id));

    const record = await repo.findById(uploaded.id);
    assert.equal(record?.status, "failed");
    assert.ok(record?.errorMessage);
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
