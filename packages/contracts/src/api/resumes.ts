export type ResumeStatus = "pending" | "processing" | "parsed" | "failed";

/** Default max upload size (5 MiB). Keep in sync with RESUME_MAX_BYTES env default. */
export const DEFAULT_RESUME_MAX_BYTES = 5_242_880;

export interface ResumeDto {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  status: ResumeStatus;
  skills: string[];
  summary: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResumeResponse {
  resume: ResumeDto;
  jobId: string;
  queue: string;
}

export interface ListResumesResponse {
  resumes: ResumeDto[];
}
