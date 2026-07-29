import type { AuthUserDto } from "@autoapply/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

function getApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return apiBaseUrl;
}

export async function fetchCurrentUser(accessToken: string): Promise<AuthUserDto> {
  const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<AuthUserDto>;
}

export async function enqueueHealthPing(accessToken: string): Promise<{
  jobId: string | number | undefined;
  queue: string;
  name: string;
}> {
  const response = await fetch(`${getApiBaseUrl()}/api/users/queue/ping`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Queue ping failed with status ${response.status}`);
  }

  return response.json() as Promise<{
    jobId: string | number | undefined;
    queue: string;
    name: string;
  }>;
}
