import { config } from "@autoapply/config";
import type { BrowserExecuteRequest, BrowserExecuteResponse } from "@autoapply/contracts";

export async function postBrowserExecute(
  body: BrowserExecuteRequest,
): Promise<BrowserExecuteResponse> {
  const response = await fetch(`${config.browser.url}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Browser-Internal-Token": config.browser.internalToken,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Browser execute failed (${response.status}): ${text}`);
  }

  return (await response.json()) as BrowserExecuteResponse;
}
