import type { ApplicationPlan, JobBoardPlugin } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

const logger = createLogger("automation");

export interface AutomationRunInput {
  plugin: JobBoardPlugin;
  plan: ApplicationPlan;
}

export async function runAutomation(input: AutomationRunInput): Promise<void> {
  logger.warn("runAutomation not implemented", {
    jobId: input.plan.jobId,
    plugin: input.plugin.name,
  });
  throw new Error("Not implemented: runAutomation");
}

export async function scheduleAutomation(input: {
  userId: string;
  jobId: string;
  pluginName: string;
}): Promise<{ runId: string }> {
  logger.warn("scheduleAutomation not implemented", input);
  throw new Error("Not implemented: scheduleAutomation");
}
