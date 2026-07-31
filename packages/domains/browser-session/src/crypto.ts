import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export function encryptPlaintext(plaintext: string, key: Buffer): EncryptedPayload {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext: encrypted, iv, authTag };
}

export function decryptPlaintext(payload: EncryptedPayload, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  const decipher = createDecipheriv(ALGORITHM, key, payload.iv);
  decipher.setAuthTag(payload.authTag);
  const decrypted = Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
