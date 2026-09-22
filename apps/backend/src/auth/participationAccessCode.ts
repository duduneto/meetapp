import crypto from "node:crypto";

const ACCESS_CODE_BYTES = 16;
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/u;
const PARTICIPATION_LINK_VALIDITY_DAYS = 180;

export function generateParticipationAccessCode() {
  return crypto.randomBytes(ACCESS_CODE_BYTES).toString("base64url");
}

export function isParticipationAccessCode(value: string) {
  return ACCESS_CODE_PATTERN.test(value);
}

export function hashParticipationAccessCode(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function participationLinkIssuedAfter(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - PARTICIPATION_LINK_VALIDITY_DAYS);
  return cutoff;
}
