import type { ApplicationDto } from "@autoapply/contracts";
import { getJobForUser } from "@autoapply/jobs";
import { createLogger } from "@autoapply/logger";

import { PrismaApplicationRepository } from "./repository/prisma-application.repository.js";
import {
  type ApplicationRepository,
  toApplicationDto,
} from "./repository/application.repository.js";

const logger = createLogger("applications.domain");

let repository: ApplicationRepository = new PrismaApplicationRepository();
let jobLookup: typeof getJobForUser = getJobForUser;

export function setApplicationRepository(repo: ApplicationRepository): void {
  repository = repo;
}

export function resetApplicationRepository(): void {
  repository = new PrismaApplicationRepository();
}

export function setApplicationJobLookup(lookup: typeof getJobForUser): void {
  jobLookup = lookup;
}

export function resetApplicationJobLookup(): void {
  jobLookup = getJobForUser;
}

const DEFAULT_PROVIDER = "linkedin";

export async function queueApplication(input: {
  userId: string;
  jobId: string;
  provider?: string;
}): Promise<{ applicationId: string; application: ApplicationDto }> {
  const provider = (input.provider ?? DEFAULT_PROVIDER).trim();
  const job = await jobLookup(input.jobId, input.userId);
  if (!job) {
    throw new Error("Job not found");
  }
  if (!job.url?.trim()) {
    throw new Error("Job URL is required to apply");
  }

  const existing = await repository.findByUserJobProvider(input.userId, input.jobId, provider);
  if (existing) {
    throw new Error("Application already exists for this job and provider");
  }

  const record = await repository.create({
    userId: input.userId,
    jobId: input.jobId,
    provider,
  });

  logger.info("Application queued", {
    applicationId: record.id,
    userId: input.userId,
    jobId: input.jobId,
    provider,
  });

  return {
    applicationId: record.id,
    application: toApplicationDto(record),
  };
}

export async function listApplicationsByUser(userId: string): Promise<ApplicationDto[]> {
  const records = await repository.listByUserId(userId);
  return records.map(toApplicationDto);
}

export async function getApplicationForUser(
  applicationId: string,
  userId: string,
): Promise<ApplicationDto | null> {
  const record = await repository.findByIdForUser(applicationId, userId);
  return record ? toApplicationDto(record) : null;
}

export async function markApplicationSubmitting(applicationId: string): Promise<void> {
  await repository.updateStatus(applicationId, "submitting");
}

export async function markApplicationSubmitted(
  applicationId: string,
  externalApplicationId: string | null,
): Promise<ApplicationDto> {
  const record = await repository.markSubmitted(applicationId, externalApplicationId);
  logger.info("Application submitted", { applicationId, externalApplicationId });
  return toApplicationDto(record);
}

export async function markApplicationFailed(
  applicationId: string,
  errorMessage: string,
): Promise<ApplicationDto> {
  const record = await repository.markFailed(applicationId, errorMessage);
  logger.warn("Application failed", { applicationId, errorMessage });
  return toApplicationDto(record);
}

export async function getApplicationExecutionContext(
  applicationId: string,
  userId: string,
): Promise<{ application: ApplicationDto; jobUrl: string; provider: string } | null> {
  const application = await getApplicationForUser(applicationId, userId);
  if (!application) {
    return null;
  }
  const job = await jobLookup(application.jobId, userId);
  if (!job?.url?.trim()) {
    return null;
  }
  return {
    application,
    jobUrl: job.url.trim(),
    provider: application.provider,
  };
}
