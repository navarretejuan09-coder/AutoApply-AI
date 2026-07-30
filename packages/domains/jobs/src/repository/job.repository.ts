import type { JobDto, JobStatus } from "@autoapply/contracts";

export interface CreateJobInput {
  userId: string;
  title: string;
  company: string;
  description: string;
  url?: string | null;
  location?: string | null;
}

export interface JobRecord {
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
}

export type MatchWrite =
  | {
      status: "matched";
      matchScore: number;
      matchRationale: string;
    }
  | {
      status: "failed";
      errorMessage: string;
    };

export interface JobRepository {
  create(input: CreateJobInput): Promise<JobRecord>;
  findByIdForUser(id: string, userId: string): Promise<JobRecord | null>;
  listByUserId(userId: string): Promise<JobRecord[]>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  updateMatchResult(id: string, input: MatchWrite): Promise<JobRecord>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
}

export function toJobDto(record: JobRecord): JobDto {
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
