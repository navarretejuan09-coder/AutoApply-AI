import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { CORRELATION_ID_HEADER } from "@autoapply/contracts";
import { randomUUID } from "node:crypto";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { Request, Response } from "express";

import { RequestContextService } from "./request-context.service.js";

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const headerValue = request.headers[CORRELATION_ID_HEADER];
    const correlationId =
      typeof headerValue === "string" && headerValue.length > 0
        ? headerValue
        : randomUUID();

    this.requestContext.setCorrelationId(correlationId);
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle().pipe(
      tap(() => {
        this.requestContext.clear();
      }),
    );
  }
}
