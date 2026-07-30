import {
  runAgent,
  type JobMatchAgentResult,
  type JobMatchDeps,
  resetJobMatchDeps,
  setJobMatchDeps,
} from "@autoapply/agents";
import type { JobDto } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";
import { getLatestParsedResumeForMatching, type ResumeMatchContext } from "@autoapply/resume";

import { PrismaJobRepository } from "./repository/prisma-job.repository.js";
import { type CreateJobInput, type JobRepository, toJobDto } from "./repository/job.repository.js";

const logger = createLogger("jobs.domain");

let repository: JobRepository = new PrismaJobRepository();
let resumeLookup: (userId: string) => Promise<ResumeMatchContext | null> =
  getLatestParsedResumeForMatching;

/** Override repository (testing). */
export function setJobRepository(repo: JobRepository): void {
  repository = repo;
}

export function setResumeMatchLookup(
  lookup: (userId: string) => Promise<ResumeMatchContext | null>,
): void {
  resumeLookup = lookup;
}

export function resetResumeMatchLookup(): void {
  resumeLookup = getLatestParsedResumeForMatching;
}

export function setJobsAgentDeps(deps: Partial<JobMatchDeps>): void {
  setJobMatchDeps(deps);
}

export function resetJobsAgentDeps(): void {
  resetJobMatchDeps();
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  return trimmed;
}

export async function createJob(input: CreateJobInput): Promise<JobDto> {
  const title = requireNonEmpty(input.title, "title");
  const company = requireNonEmpty(input.company, "company");
  const description = requireNonEmpty(input.description, "description");

  const record = await repository.create({
    userId: input.userId,
    title,
    company,
    description,
    url: input.url?.trim() || null,
    location: input.location?.trim() || null,
  });

  logger.info("Job created", {
    jobId: record.id,
    userId: record.userId,
    title: record.title,
  });

  return toJobDto(record);
}

export interface MatchJobInput {
  jobId: string;
  userId: string;
}

export async function matchJob(input: MatchJobInput): Promise<JobDto> {
  const existing = await repository.findByIdForUser(input.jobId, input.userId);
  if (!existing) {
    throw new Error("Job not found");
  }

  await repository.updateStatus(input.jobId, "matching");

  try {
    const resume = await resumeLookup(input.userId);
    if (!resume) {
      const updated = await repository.updateMatchResult(input.jobId, {
        status: "failed",
        errorMessage: "Upload and parse a resume before matching jobs",
      });
      return toJobDto(updated);
    }

    const agentResult = (await runAgent("job-match", {
      resumeText: resume.extractedText,
      resumeSummary: resume.summary,
      skills: resume.skills,
      title: existing.title,
      company: existing.company,
      description: existing.description,
    })) as JobMatchAgentResult;

    const updated = await repository.updateMatchResult(input.jobId, {
      status: "matched",
      matchScore: agentResult.score,
      matchRationale: agentResult.rationale,
    });

    logger.info("Job matched", {
      jobId: updated.id,
      userId: updated.userId,
      score: updated.matchScore,
      resumeId: resume.resumeId,
    });

    return toJobDto(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown match error";

    const updated = await repository.updateMatchResult(input.jobId, {
      status: "failed",
      errorMessage: message,
    });

    logger.error("Job match failed", {
      jobId: input.jobId,
      userId: input.userId,
      error: message,
    });

    return toJobDto(updated);
  }
}

export async function listJobsByUser(userId: string): Promise<JobDto[]> {
  const records = await repository.listByUserId(userId);
  return records.map(toJobDto);
}

export async function getJobForUser(jobId: string, userId: string): Promise<JobDto | null> {
  const record = await repository.findByIdForUser(jobId, userId);
  return record ? toJobDto(record) : null;
}

export async function archiveJob(jobId: string, userId: string): Promise<boolean> {
  const deleted = await repository.deleteForUser(jobId, userId);
  if (deleted) {
    logger.info("Job archived", { jobId, userId });
  }
  return deleted;
}

export async function searchJobs(): Promise<never[]> {
  return [];
}

export async function rankJob(jobId: string, userId: string): Promise<number> {
  const matched = await matchJob({ jobId, userId });
  if (matched.matchScore == null) {
    throw new Error(matched.errorMessage ?? "Match failed");
  }
  return matched.matchScore;
}

export async function saveJob(): Promise<never> {
  throw new Error("Not implemented: saveJob — use createJob");
}
