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

export interface ApplicationSubmittedPayload {
  applicationId: string;
  jobId: string;
  userId: string;
  status: "queued" | "submitted" | "failed";
}

export interface UserRegisteredPayload {
  userId: string;
  email: string;
}

export interface HealthPingRequestedPayload {
  source: string;
  timestamp: string;
}
