export const HEALTH_QUEUE_NAME = "health" as const;
export const HEALTH_PING_JOB_NAME = "health.ping" as const;

export interface HealthPingJobData {
  source: string;
  timestamp: string;
  correlationId: string;
  causationId: string;
}

export const RESUME_QUEUE_NAME = "resume" as const;
export const RESUME_PARSE_JOB_NAME = "resume.parse" as const;

export interface ResumeParseJobData {
  resumeId: string;
  userId: string;
  correlationId: string;
  causationId: string;
}

export const JOB_QUEUE_NAME = "jobs" as const;
export const JOB_MATCH_JOB_NAME = "job.match" as const;

export interface JobMatchJobData {
  jobId: string;
  userId: string;
  correlationId: string;
  causationId: string;
}
