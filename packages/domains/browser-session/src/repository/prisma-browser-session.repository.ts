import { prisma } from "@autoapply/database";
import { config } from "@autoapply/config";

import { decryptPlaintext, encryptPlaintext } from "../crypto.js";
import type {
  BrowserSessionRecord,
  BrowserSessionRepository,
} from "./browser-session.repository.js";

export class PrismaBrowserSessionRepository implements BrowserSessionRepository {
  async upsert(input: {
    userId: string;
    provider: string;
    storageStateJson: string;
  }): Promise<BrowserSessionRecord> {
    const key = config.cookieEncryption.key;
    const encrypted = encryptPlaintext(input.storageStateJson, key);

    const row = await prisma.browserSession.upsert({
      where: {
        userId_provider: { userId: input.userId, provider: input.provider },
      },
      create: {
        userId: input.userId,
        provider: input.provider,
        encryptedCookies: Uint8Array.from(encrypted.ciphertext),
        iv: Uint8Array.from(encrypted.iv),
        authTag: Uint8Array.from(encrypted.authTag),
      },
      update: {
        encryptedCookies: Uint8Array.from(encrypted.ciphertext),
        iv: Uint8Array.from(encrypted.iv),
        authTag: Uint8Array.from(encrypted.authTag),
      },
    });

    return {
      userId: row.userId,
      provider: row.provider,
      storageStateJson: input.storageStateJson,
      updatedAt: row.updatedAt,
    };
  }

  async findByUserAndProvider(
    userId: string,
    provider: string,
  ): Promise<BrowserSessionRecord | null> {
    const row = await prisma.browserSession.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!row) {
      return null;
    }

    const key = config.cookieEncryption.key;
    const storageStateJson = decryptPlaintext(
      {
        ciphertext: Buffer.from(row.encryptedCookies),
        iv: Buffer.from(row.iv),
        authTag: Buffer.from(row.authTag),
      },
      key,
    );

    return {
      userId: row.userId,
      provider: row.provider,
      storageStateJson,
      updatedAt: row.updatedAt,
    };
  }

  async delete(userId: string, provider: string): Promise<boolean> {
    const result = await prisma.browserSession.deleteMany({
      where: { userId, provider },
    });
    return result.count > 0;
  }
}
