import assert from "node:assert/strict";
import test from "node:test";
import { signPublicAccessToken, verifyPublicAccessToken } from "./publicAccessJwt.js";

test("signs and validates a public access JWT", () => {
  const previousSecret = process.env.PUBLIC_SHARE_JWT_SECRET;
  process.env.PUBLIC_SHARE_JWT_SECRET = "test-public-share-secret-with-more-than-32-characters";

  try {
    const expiresAt = new Date(Date.now() + 60_000);
    const token = signPublicAccessToken({
      tokenId: "public-token-id",
      congregationId: "congregation-id",
      expiresAt
    });

    assert.deepEqual(verifyPublicAccessToken(token), {
      tokenId: "public-token-id",
      congregationId: "congregation-id"
    });
  } finally {
    if (previousSecret === undefined) delete process.env.PUBLIC_SHARE_JWT_SECRET;
    else process.env.PUBLIC_SHARE_JWT_SECRET = previousSecret;
  }
});

test("rejects an expired public access JWT", () => {
  const previousSecret = process.env.PUBLIC_SHARE_JWT_SECRET;
  process.env.PUBLIC_SHARE_JWT_SECRET = "test-public-share-secret-with-more-than-32-characters";

  try {
    const token = signPublicAccessToken({
      tokenId: "public-token-id",
      congregationId: "congregation-id",
      expiresAt: new Date(Date.now() - 60_000)
    });
    assert.equal(verifyPublicAccessToken(token), null);
  } finally {
    if (previousSecret === undefined) delete process.env.PUBLIC_SHARE_JWT_SECRET;
    else process.env.PUBLIC_SHARE_JWT_SECRET = previousSecret;
  }
});
