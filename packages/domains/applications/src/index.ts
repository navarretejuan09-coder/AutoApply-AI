import { createLogger } from "@autoapply/logger";

const logger = createLogger("applications.domain");

export async function queueApplication(input: {
  userId: string;
  jobId: string;
}): Promise<{ applicationId: string }> {
  logger.warn("queueApplication not implemented", input);
  throw new Error("Not implemented: queueApplication");
}

export async function submitApplication(applicationId: string): Promise<{ status: string }> {
  logger.warn("submitApplication not implemented", { applicationId });
  throw new Error("Not implemented: submitApplication");
}
