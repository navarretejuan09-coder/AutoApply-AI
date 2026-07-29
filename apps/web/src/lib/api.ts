import { CORRELATION_ID_HEADER } from "@autoapply/contracts";
import type {
  AuthUserDto,
  EnqueueHealthPingResponse,
  ListResumesResponse,
  ResumeDto,
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

export async function enqueueHealthPing(
  accessToken: string,
): Promise<EnqueueHealthPingResponse> {
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

export async function fetchResume(
  accessToken: string,
  resumeId: string,
): Promise<ResumeDto> {
  const response = await fetch(`${getApiBaseUrl()}/api/resumes/${resumeId}`, {
    headers: buildHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch resume with status ${response.status}`);
  }

  return response.json() as Promise<ResumeDto>;
}

export async function uploadResume(
  accessToken: string,
  file: File,
): Promise<UploadResumeResponse> {
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
