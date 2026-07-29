import type { JobPosting, SearchCriteria } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("jobs.domain");

export async function searchJobs(criteria: SearchCriteria): Promise<JobPosting[]> {
  logger.warn("searchJobs not implemented", { keywords: criteria.keywords });
  return [];
}

export async function saveJob(job: JobPosting): Promise<{ jobId: string }> {
  logger.warn("saveJob not implemented", { jobId: job.id });
  throw new Error("Not implemented: saveJob");
}

export async function rankJob(jobId: string, userId: string): Promise<number> {
  logger.warn("rankJob not implemented", { jobId, userId });
  throw new Error("Not implemented: rankJob");
}

export async function archiveJob(jobId: string): Promise<void> {
  logger.warn("archiveJob not implemented", { jobId });
  throw new Error("Not implemented: archiveJob");
}
