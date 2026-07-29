import { Injectable } from "@nestjs/common";

@Injectable()
export class RequestContextService {
  private correlationId?: string;

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  clear(): void {
    this.correlationId = undefined;
  }
}
