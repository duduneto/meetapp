import assert from "node:assert/strict";
import test from "node:test";
import {
  signParticipationToken,
  verifyParticipationToken
} from "./participationJwt.js";

test("signs and validates an assignment participation JWT", () => {
  const previousSecret = process.env.PARTICIPATION_JWT_SECRET;
  process.env.PARTICIPATION_JWT_SECRET = "test-participation-secret-with-more-than-32-characters";

  try {
    const token = signParticipationToken({
      assignmentId: "assignment-1",
      participantId: "participant-1",
      version: 4
    });

    assert.deepEqual(verifyParticipationToken(token), {
      assignmentId: "assignment-1",
      participantId: "participant-1",
      version: 4
    });
    assert.equal(verifyParticipationToken(`${token}invalid`), null);
  } finally {
    if (previousSecret === undefined) delete process.env.PARTICIPATION_JWT_SECRET;
    else process.env.PARTICIPATION_JWT_SECRET = previousSecret;
  }
});
