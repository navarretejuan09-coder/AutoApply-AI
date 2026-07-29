export type HealthStatus = "ok" | "degraded" | "error";

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
}
