export const HEALTH_QUEUE_NAME = "health" as const;
export const HEALTH_PING_JOB_NAME = "health.ping" as const;

export interface HealthPingJobData {
  source: string;
  timestamp: string;
}
