import {
  createJobMatchAgent,
  type JobMatchAgentInput,
  type JobMatchAgentResult,
} from "@autoapply/agents";
import type { JobDto } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";
import { getLatestParsedResumeForMatching, type ResumeMatchContext } from "@autoapply/resume";

import { PrismaJobRepository } from "./repository/prisma-job.repository.js";
import { type CreateJobInput, type JobRepository, toJobDto } from "./repository/job.repository.js";

const logger = createLogger("jobs.domain");

export interface JobsDomainDeps {
  repository: JobRepository;
  resumeLookup: (userId: string) => Promise<ResumeMatchContext | null>;
  runJobMatch: (input: JobMatchAgentInput) => Promise<JobMatchAgentResult>;
}

export interface MatchJobInput {
  jobId: string;
  userId: string;
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  return trimmed;
}

export function createJobsDomain(deps: JobsDomainDeps) {
  const { repository, resumeLookup, runJobMatch } = deps;

  async function createJob(input: CreateJobInput): Promise<JobDto> {
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

  async function matchJob(input: MatchJobInput): Promise<JobDto> {
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

      const agentResult = await runJobMatch({
        resumeText: resume.extractedText,
        resumeSummary: resume.summary,
        skills: resume.skills,
        title: existing.title,
        company: existing.company,
        description: existing.description,
      });

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

  async function listJobsByUser(userId: string): Promise<JobDto[]> {
    const records = await repository.listByUserId(userId);
    return records.map(toJobDto);
  }

  async function getJobForUser(jobId: string, userId: string): Promise<JobDto | null> {
    const record = await repository.findByIdForUser(jobId, userId);
    return record ? toJobDto(record) : null;
  }

  async function archiveJob(jobId: string, userId: string): Promise<boolean> {
    const deleted = await repository.deleteForUser(jobId, userId);
    if (deleted) {
      logger.info("Job archived", { jobId, userId });
    }
    return deleted;
  }

  async function markJobFailed(jobId: string, errorMessage: string): Promise<JobDto> {
    const updated = await repository.updateMatchResult(jobId, {
      status: "failed",
      errorMessage,
    });
    return toJobDto(updated);
  }

  return {
    createJob,
    matchJob,
    listJobsByUser,
    getJobForUser,
    archiveJob,
    markJobFailed,
  };
}

export type JobsDomain = ReturnType<typeof createJobsDomain>;

const production = createJobsDomain({
  repository: new PrismaJobRepository(),
  resumeLookup: getLatestParsedResumeForMatching,
  runJobMatch: createJobMatchAgent(),
});

export const createJob = production.createJob;
export const matchJob = production.matchJob;
export const listJobsByUser = production.listJobsByUser;
export const getJobForUser = production.getJobForUser;
export const archiveJob = production.archiveJob;
export const markJobFailed = production.markJobFailed;
