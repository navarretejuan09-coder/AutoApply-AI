import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import type { SessionPayload, UpsertBrowserSessionRequest } from "@autoapply/contracts";
import {
  getBrowserSessionStatus,
  upsertBrowserSession,
} from "@autoapply/browser-session";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";

@Controller("browser-sessions")
@UseGuards(JwtAuthGuard)
export class BrowserSessionsController {
  @Put(":provider")
  async upsertSession(
    @CurrentUser() user: SessionPayload,
    @Param("provider") provider: string,
    @Body() body: UpsertBrowserSessionRequest,
  ) {
    try {
      const result = await upsertBrowserSession({
        userId: user.sub,
        provider,
        storageStateJson: body.storageStateJson,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save browser session";
      throw new BadRequestException(message);
    }
  }

  @Get(":provider")
  async getSessionStatus(@CurrentUser() user: SessionPayload, @Param("provider") provider: string) {
    const status = await getBrowserSessionStatus(user.sub, provider);
    return {
      provider,
      configured: status.configured,
      updatedAt: status.updatedAt,
    };
  }
}
