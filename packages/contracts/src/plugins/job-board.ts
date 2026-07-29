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

export interface JobBoardPlugin {
  readonly name: string;
  authenticate(): Promise<void>;
  search(criteria: SearchCriteria): Promise<JobPosting[]>;
  prepareApplication(jobId: string): Promise<ApplicationPlan>;
  executeApplication(plan: ApplicationPlan): Promise<ApplicationResult>;
}
