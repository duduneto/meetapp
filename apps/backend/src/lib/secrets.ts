import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export function createSecret(prefix: string) {
  return `${prefix}_${crypto.randomBytes(24).toString("base64url")}`;
}

export async function hashSecret(secret: string) {
  return bcrypt.hash(secret, 12);
}

export async function verifySecret(secret: string, hash: string) {
  return bcrypt.compare(secret, hash);
}
