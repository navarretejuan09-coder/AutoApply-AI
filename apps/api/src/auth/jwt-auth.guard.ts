import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyJwt } from "@autoapply/auth";
import { config } from "@autoapply/config";
import type { SessionPayload } from "@autoapply/contracts";
import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: SessionPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = authorization.slice("Bearer ".length).trim();

    try {
      request.user = await verifyJwt(token, config.auth.secret);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
