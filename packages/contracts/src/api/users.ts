import type { AuthUserDto } from "../dto/auth.js";

export type GetCurrentUserResponse = AuthUserDto;

export interface EnqueueHealthPingResponse {
  jobId: string | number | undefined;
  queue: string;
  name: string;
}
