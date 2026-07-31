import { prisma } from "@autoapply/database";
import type { ApplicationStatus } from "@autoapply/contracts";

import type {
  ApplicationRecord,
  ApplicationRepository,
  CreateApplicationInput,
} from "./application.repository.js";

const applicationSelect = {
  id: true,
  userId: true,
  jobId: true,
  provider: true,
  status: true,
  externalApplicationId: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapApplication(record: {
  id: string;
  userId: string;
  jobId: string;
  provider: string;
  status: ApplicationStatus;
  externalApplicationId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ApplicationRecord {
  return {
    id: record.id,
    userId: record.userId,
    jobId: record.jobId,
    provider: record.provider,
    status: record.status,
    externalApplicationId: record.externalApplicationId,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaApplicationRepository implements ApplicationRepository {
  async create(input: CreateApplicationInput): Promise<ApplicationRecord> {
    const row = await prisma.application.create({
      data: {
        userId: input.userId,
        jobId: input.jobId,
        provider: input.provider,
        status: "queued",
      },
      select: applicationSelect,
    });
    return mapApplication(row);
  }

  async findByIdForUser(id: string, userId: string): Promise<ApplicationRecord | null> {
    const row = await prisma.application.findFirst({
      where: { id, userId },
      select: applicationSelect,
    });
    return row ? mapApplication(row) : null;
  }

  async findByUserJobProvider(
    userId: string,
    jobId: string,
    provider: string,
  ): Promise<ApplicationRecord | null> {
    const row = await prisma.application.findUnique({
      where: { userId_jobId_provider: { userId, jobId, provider } },
      select: applicationSelect,
    });
    return row ? mapApplication(row) : null;
  }

  async listByUserId(userId: string): Promise<ApplicationRecord[]> {
    const rows = await prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: applicationSelect,
    });
    return rows.map(mapApplication);
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    await prisma.application.update({
      where: { id },
      data: { status },
    });
  }

  async markSubmitted(
    id: string,
    externalApplicationId: string | null,
  ): Promise<ApplicationRecord> {
    const row = await prisma.application.update({
      where: { id },
      data: {
        status: "submitted",
        externalApplicationId,
        errorMessage: null,
      },
      select: applicationSelect,
    });
    return mapApplication(row);
  }

  async markFailed(id: string, errorMessage: string): Promise<ApplicationRecord> {
    const row = await prisma.application.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage,
      },
      select: applicationSelect,
    });
    return mapApplication(row);
  }
}
