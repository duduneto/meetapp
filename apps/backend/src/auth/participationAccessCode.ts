import crypto from "node:crypto";

const ACCESS_CODE_BYTES = 16;
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/u;

export function generateParticipationAccessCode() {
  return crypto.randomBytes(ACCESS_CODE_BYTES).toString("base64url");
}

export function isParticipationAccessCode(value: string) {
  return ACCESS_CODE_PATTERN.test(value);
}

export function hashParticipationAccessCode(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
