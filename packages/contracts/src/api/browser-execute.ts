import type { ApplicationPlan, ApplicationResult } from "../plugins/job-board.js";

export interface BrowserExecuteRequest {
  userId: string;
  applicationId: string;
  pluginName: string;
  plan: ApplicationPlan;
}

export interface BrowserExecuteResponse {
  result: ApplicationResult;
}
