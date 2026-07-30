export type JobStatus = "pending" | "matching" | "matched" | "failed";

export interface JobDto {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequest {
  title: string;
  company: string;
  description: string;
  url?: string;
  location?: string;
}

export interface CreateJobResponse {
  job: JobDto;
  queueJobId: string;
  queue: string;
}

export interface ListJobsResponse {
  jobs: JobDto[];
}
