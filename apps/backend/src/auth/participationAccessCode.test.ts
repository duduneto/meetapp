import assert from "node:assert/strict";
import test from "node:test";
import {
  generateParticipationAccessCode,
  hashParticipationAccessCode,
  isParticipationAccessCode,
  participationLinkIssuedAfter
} from "./participationAccessCode.js";

test("creates a short URL-safe participation access code", () => {
  const code = generateParticipationAccessCode();

  assert.equal(code.length, 22);
  assert.equal(isParticipationAccessCode(code), true);
  assert.equal(code.includes("."), false);
});

test("hashes participation access codes deterministically", () => {
  const code = "abcdefghijklmnopqrstuv";

  assert.equal(hashParticipationAccessCode(code), hashParticipationAccessCode(code));
  assert.equal(hashParticipationAccessCode(code).length, 64);
  assert.equal(isParticipationAccessCode(`${code}.`), false);
});

test("expires participation links 180 days after they are issued", () => {
  assert.equal(
    participationLinkIssuedAfter(new Date("2026-09-21T12:00:00.000Z")).toISOString(),
    "2026-03-25T12:00:00.000Z"
  );
});
