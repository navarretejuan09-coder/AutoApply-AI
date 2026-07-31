import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { BrowserSessionsController } from "./browser-sessions.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [BrowserSessionsController],
})
export class BrowserSessionsModule {}
