import { createLogger } from "@autoapply/logger";

const logger = createLogger("analytics.domain");

export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  logger.warn("trackEvent not implemented", { event, properties });
}
