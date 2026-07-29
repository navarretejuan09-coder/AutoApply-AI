import { randomUUID } from "node:crypto";

import { config } from "@autoapply/config";
import { CORRELATION_ID_HEADER } from "@autoapply/contracts";
import type { AuthUserDto, EnqueueHealthPingResponse } from "@autoapply/contracts";

function getApiBaseUrl(): string {
  return config.web.publicApiUrl;
}

function buildHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    [CORRELATION_ID_HEADER]: randomUUID(),
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
