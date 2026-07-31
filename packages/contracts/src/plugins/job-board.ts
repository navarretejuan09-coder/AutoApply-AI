export interface SearchCriteria {
  keywords: string[];
  location?: string;
  remote?: boolean;
  limit?: number;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  url: string;
  location?: string;
  description?: string;
}

export interface ApplicationPlan {
  jobId: string;
  steps: string[];
  metadata?: Record<string, unknown>;
}

export interface ApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
}

export interface BrowserPage {
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  url(): string;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
}

export interface PluginContext {
  page: BrowserPage;
}

export interface JobBoardPlugin {
  readonly name: string;
  authenticate(ctx: PluginContext): Promise<void>;
  search(criteria: SearchCriteria, ctx?: PluginContext): Promise<JobPosting[]>;
  prepareApplication(jobId: string, ctx?: PluginContext): Promise<ApplicationPlan>;
  executeApplication(plan: ApplicationPlan, ctx: PluginContext): Promise<ApplicationResult>;
}
