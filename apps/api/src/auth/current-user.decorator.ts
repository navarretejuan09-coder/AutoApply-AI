import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionPayload } from "@autoapply/types";

import type { AuthenticatedRequest } from "./jwt-auth.guard.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
