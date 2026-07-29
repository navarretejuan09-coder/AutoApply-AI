import { Controller, Get } from "@nestjs/common";

import type { HealthCheckResponse } from "@autoapply/contracts";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthCheckResponse {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
  }
}
