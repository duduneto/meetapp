import crypto from "node:crypto";

const ACCESS_CODE_BYTES = 16;
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/u;

export function generatePublicAccessCode() {
  return crypto.randomBytes(ACCESS_CODE_BYTES).toString("base64url");
}

export function isPublicAccessCode(value: string) {
  return ACCESS_CODE_PATTERN.test(value);
}
