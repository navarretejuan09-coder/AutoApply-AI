import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { CorrelationIdInterceptor } from "./correlation-id.interceptor.js";
import { RequestContextService } from "./request-context.service.js";

@Global()
@Module({
  providers: [
    RequestContextService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (requestContext: RequestContextService) =>
        new CorrelationIdInterceptor(requestContext),
      inject: [RequestContextService],
    },
  ],
  exports: [RequestContextService],
})
export class CommonModule {}
