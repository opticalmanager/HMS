import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Derives a deterministic 256-bit (32 bytes) encryption key from BETTER_AUTH_SECRET
 */
function getDerivedKey(): Buffer {
  const secret = env.BETTER_AUTH_SECRET || "better-auth-secret-apex-hms-clinic-crm-key-32ch";
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Encrypts a plaintext string (e.g. WhatsApp Broadcast API key) using AES-256-GCM.
 * Output format: `iv:authTag:ciphertext` (all in hex encoding).
 */
export function encryptBroadcastApiKey(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Plaintext string is required for encryption");
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext formatted as `iv:authTag:ciphertext` using AES-256-GCM.
 * Returns the decrypted plaintext string.
 */
export function decryptBroadcastApiKey(cipherString: string): string {
  if (!cipherString || typeof cipherString !== "string") {
    throw new Error("Cipher string is required for decryption");
  }

  const parts = cipherString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format. Expected 'iv:authTag:ciphertext'");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes`);
  }

  if (authTag.length !== 16) {
    throw new Error("Invalid auth tag length: expected 16 bytes");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
