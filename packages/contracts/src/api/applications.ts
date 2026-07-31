export type ApplicationStatus = "queued" | "submitting" | "submitted" | "failed";

export interface ApplicationDto {
  id: string;
  userId: string;
  jobId: string;
  provider: string;
  status: ApplicationStatus;
  externalApplicationId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  jobId: string;
  provider?: string;
}

export interface CreateApplicationResponse {
  application: ApplicationDto;
}

export interface ListApplicationsResponse {
  applications: ApplicationDto[];
}

export interface GetApplicationResponse {
  application: ApplicationDto;
}
