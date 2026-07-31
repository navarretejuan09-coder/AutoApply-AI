export interface JobFoundPayload {
  jobId: string;
  title: string;
  company: string;
  url: string;
  provider: string;
}

export interface ResumeUploadedPayload {
  resumeId: string;
  userId: string;
  fileName: string;
}

export interface ResumeParsedPayload {
  resumeId: string;
  userId: string;
  skills: string[];
  summary: string | null;
}

export interface ApplicationSubmittedPayload {
  applicationId: string;
  jobId: string;
  userId: string;
  status: "queued" | "submitting" | "submitted" | "failed";
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
}

export interface HealthPingRequestedPayload {
  source: string;
  timestamp: string;
}
