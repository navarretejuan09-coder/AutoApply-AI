import { createLogger } from "@autoapply/logger";

const logger = createLogger("notifications.domain");

export async function notifyUser(
  userId: string,
  message: string,
  channel?: "email" | "push",
): Promise<void> {
  logger.warn("notifyUser not implemented", { userId, message, channel });
}
