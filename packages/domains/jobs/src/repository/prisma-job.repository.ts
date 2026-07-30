import { prisma } from "@autoapply/database";
import type { JobStatus } from "@autoapply/contracts";

import type {
  CreateJobInput,
  JobRecord,
  JobRepository,
  MatchWrite,
} from "./job.repository.js";

const jobSelect = {
  id: true,
  userId: true,
  title: true,
  company: true,
  url: true,
  location: true,
  description: true,
  status: true,
  matchScore: true,
  matchRationale: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapJob(record: {
  id: string;
  userId: string;
  title: string;
  company: string;
  url: string | null;
  location: string | null;
  description: string;
  status: JobStatus;
  matchScore: number | null;
  matchRationale: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): JobRecord {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    company: record.company,
    url: record.url,
    location: record.location,
    description: record.description,
    status: record.status,
    matchScore: record.matchScore,
    matchRationale: record.matchRationale,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaJobRepository implements JobRepository {
  async create(input: CreateJobInput): Promise<JobRecord> {
    const job = await prisma.job.create({
      data: {
        userId: input.userId,
        title: input.title,
        company: input.company,
        description: input.description,
        url: input.url ?? null,
        location: input.location ?? null,
      },
      select: jobSelect,
    });

    return mapJob(job);
  }

  async findByIdForUser(id: string, userId: string): Promise<JobRecord | null> {
    const job = await prisma.job.findFirst({
      where: { id, userId },
      select: jobSelect,
    });

    return job ? mapJob(job) : null;
  }

  async listByUserId(userId: string): Promise<JobRecord[]> {
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: jobSelect,
    });

    return jobs.map(mapJob);
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    await prisma.job.update({
      where: { id },
      data: { status },
      select: { id: true },
    });
  }

  async updateMatchResult(id: string, input: MatchWrite): Promise<JobRecord> {
    switch (input.status) {
      case "matched": {
        const job = await prisma.job.update({
          where: { id },
          data: {
            status: "matched",
            matchScore: input.matchScore,
            matchRationale: input.matchRationale,
            errorMessage: null,
          },
          select: jobSelect,
        });
        return mapJob(job);
      }
      case "failed": {
        const job = await prisma.job.update({
          where: { id },
          data: {
            status: "failed",
            errorMessage: input.errorMessage,
          },
          select: jobSelect,
        });
        return mapJob(job);
      }
      default: {
        const exhaustive: never = input;
        throw new Error(`Unhandled match write: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const result = await prisma.job.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }
}
