export type ResumeStatus = "pending" | "processing" | "parsed" | "failed";

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
  jobId: string | number | undefined;
  queue: string;
}

export interface ListResumesResponse {
  resumes: ResumeDto[];
}
