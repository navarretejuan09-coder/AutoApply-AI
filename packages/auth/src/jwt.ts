import { SignJWT, jwtVerify } from "jose";

import type { SessionPayload } from "@autoapply/types";

const ALGORITHM = "HS256";
const DEFAULT_EXPIRY = "7d";

function encodeSecret(secret: string): Uint8Array {
  return Uint8Array.from(Buffer.from(secret, "utf8"));
}

export interface SignJwtOptions {
  expiresIn?: string;
}

export async function signJwt(
  payload: SessionPayload,
  secret: string,
  options: SignJwtOptions = {},
): Promise<string> {
  const { sub, email, name } = payload;

  return new SignJWT({ email, name: name ?? null })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? DEFAULT_EXPIRY)
    .sign(encodeSecret(secret));
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, encodeSecret(secret), {
    algorithms: [ALGORITHM],
  });

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid JWT payload");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : null,
    iat: payload.iat,
    exp: payload.exp,
  };
}

export type { SessionPayload };
