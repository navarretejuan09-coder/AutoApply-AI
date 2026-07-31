import type { ApplicationDto, ApplicationStatus } from "@autoapply/contracts";

export interface ApplicationRecord {
  id: string;
  userId: string;
  jobId: string;
  provider: string;
  status: ApplicationStatus;
  externalApplicationId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicationInput {
  userId: string;
  jobId: string;
  provider: string;
}

export interface ApplicationRepository {
  create(input: CreateApplicationInput): Promise<ApplicationRecord>;
  findByIdForUser(id: string, userId: string): Promise<ApplicationRecord | null>;
  findByUserJobProvider(
    userId: string,
    jobId: string,
    provider: string,
  ): Promise<ApplicationRecord | null>;
  listByUserId(userId: string): Promise<ApplicationRecord[]>;
  updateStatus(id: string, status: ApplicationStatus): Promise<void>;
  markSubmitted(id: string, externalApplicationId: string | null): Promise<ApplicationRecord>;
  markFailed(id: string, errorMessage: string): Promise<ApplicationRecord>;
}

export function toApplicationDto(record: ApplicationRecord): ApplicationDto {
  return {
    id: record.id,
    userId: record.userId,
    jobId: record.jobId,
    provider: record.provider,
    status: record.status,
    externalApplicationId: record.externalApplicationId,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
