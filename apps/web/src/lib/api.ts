import { CORRELATION_ID_HEADER } from "@autoapply/contracts";
import type {
  AuthUserDto,
  ApplicationDto,
  CreateJobRequest,
  CreateJobResponse,
  EnqueueHealthPingResponse,
  ListApplicationsResponse,
  ListJobsResponse,
  ListResumesResponse,
  UploadResumeResponse,
} from "@autoapply/contracts";

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return url;
}

function buildHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    [CORRELATION_ID_HEADER]: crypto.randomUUID(),
  };
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUserDto> {
  const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<AuthUserDto>;
}

export async function enqueueHealthPing(accessToken: string): Promise<EnqueueHealthPingResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/users/queue/ping`, {
    method: "POST",
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Queue ping failed with status ${response.status}`);
  }

  return response.json() as Promise<EnqueueHealthPingResponse>;
}

export async function fetchResumes(accessToken: string): Promise<ListResumesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/resumes`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch resumes with status ${response.status}`);
  }

  return response.json() as Promise<ListResumesResponse>;
}

export async function uploadResume(accessToken: string, file: File): Promise<UploadResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getApiBaseUrl()}/api/resumes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      [CORRELATION_ID_HEADER]: crypto.randomUUID(),
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Resume upload failed with status ${response.status}`);
  }

  return response.json() as Promise<UploadResumeResponse>;
}

export async function fetchJobs(accessToken: string): Promise<ListJobsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/jobs`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs with status ${response.status}`);
  }

  return response.json() as Promise<ListJobsResponse>;
}

export async function createJob(
  accessToken: string,
  body: CreateJobRequest,
): Promise<CreateJobResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/jobs`, {
    method: "POST",
    headers: {
      ...buildHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Job create failed with status ${response.status}`);
  }

  return response.json() as Promise<CreateJobResponse>;
}

export async function deleteJob(accessToken: string, jobId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/jobs/${jobId}`, {
    method: "DELETE",
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Job delete failed with status ${response.status}`);
  }
}

export async function createApplication(
  accessToken: string,
  jobId: string,
): Promise<{ application: ApplicationDto; queueJobId: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/applications`, {
    method: "POST",
    headers: {
      ...buildHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Application create failed with status ${response.status}`);
  }

  return response.json() as Promise<{ application: ApplicationDto; queueJobId: string }>;
}

export async function fetchApplications(
  accessToken: string,
): Promise<ListApplicationsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/applications`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch applications with status ${response.status}`);
  }

  return response.json() as Promise<ListApplicationsResponse>;
}

export async function upsertLinkedInSession(
  accessToken: string,
  storageStateJson: string,
): Promise<{ provider: string; updatedAt: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/browser-sessions/linkedin`, {
    method: "PUT",
    headers: {
      ...buildHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storageStateJson }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to save LinkedIn session (${response.status})`);
  }

  return response.json() as Promise<{ provider: string; updatedAt: string }>;
}

export async function fetchLinkedInSessionStatus(
  accessToken: string,
): Promise<{ provider: string; configured: boolean; updatedAt: string | null }> {
  const response = await fetch(`${getApiBaseUrl()}/api/browser-sessions/linkedin`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session status (${response.status})`);
  }

  return response.json() as Promise<{
    provider: string;
    configured: boolean;
    updatedAt: string | null;
  }>;
}
